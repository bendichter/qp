/* eslint-disable @typescript-eslint/no-explicit-any */
import stripAnsi from "strip-ansi";
import PythonSessionClient from "../jupyter/PythonSessionClient";
import {
  ChatMessage,
  QPFunctionDescription,
  ToolExecutionContext,
} from "../types";
import { ORContentPart, ORToolCall } from "../completion/openRouterTypes";
import MarkdownContent from "../components/MarkdownContent";
import ToolCall from "../components/ToolCall";

export const toolFunction: QPFunctionDescription = {
  name: "execute_python_code",
  description:
    "Execute Python code to generate text and images. Returns the text output. Images are in the next message.",
  parameters: {
    type: "object",
    properties: {
      code: {
        type: "string",
        description: "The Python code to execute.",
      },
      reasoning: {
        type: "string",
        description: "The reasoning behind the code execution.",
      },
    },
    required: ["code"],
  },
};

type ExecutePythonCodeParams = {
  code: string;
};

type OutputItem =
  | {
      type: "stdout";
      content: string;
    }
  | {
      type: "stderr";
      content: string;
    }
  | {
      type: "image";
      format: "png";
      content: string;
    };

export const execute = async (
  params: ExecutePythonCodeParams,
  o?: ToolExecutionContext,
): Promise<{
  result: string;
  newMessages?: ChatMessage[];
}> => {
  const { code } = params;

  if (!o) {
    throw new Error("No execution context provided");
  }

  try {
    if (!o.jupyterConnectivity.jupyterServerIsAvailable) {
      throw new Error(
        "Jupyter server is not available. Please configure a Jupyter server to use this tool.",
      );
    }

    const client = new PythonSessionClient(o.jupyterConnectivity);
    const outputItems: OutputItem[] = [];
    client.onOutputItem((item) => {
      if (item.type === "iopub") {
        const msg = item.iopubMessage;
        console.log("iopub", msg);
        if ("name" in msg.content) {
          if (msg.content.name === "stdout" || msg.content.name === "stderr") {
            outputItems.push({
              type: msg.content.name,
              content: msg.content.text as string,
            });
          }
        } else if ("traceback" in msg.content) {
          outputItems.push({
            type: "stderr",
            content: stripAnsi(
              (msg.content as any).traceback.join("\n") +
                "\n" +
                msg.content.evalue,
            ),
          });
        } else if ("data" in msg.content) {
          if ("image/png" in (msg.content.data as any)) {
            outputItems.push({
              type: "image",
              format: "png",
              content: (msg.content.data as any)["image/png"] as string,
            });
          } else if ("text/plain" in (msg.content.data as any)) {
            outputItems.push({
              type: "stdout",
              content: (msg.content.data as any)["text/plain"],
            });
          }
        }
      }
    });

    let finished = false;
    let canceled = false;
    if (o.onCancelRef) {
      o.onCancelRef.onCancel = () => {
        if (finished) {
          console.info("Not cancelling execution, already finished");
          return;
        }
        console.info("Cancelling execution");
        client.cancelExecution();
        canceled = true;
      };
    }

    await client.initiate();
    await client.runCode(code);
    await client.waitUntilIdle();
    await client.shutdown();

    if (canceled) {
      return {
        result: "Execution was canceled.",
      };
    }

    finished = true;

    const outputText = outputItems
      .filter((item) => item.type === "stdout" || item.type === "stderr")
      .map((item) => item.content)
      .join("\n");

    const imageItems: (OutputItem & { type: "image" })[] = outputItems.filter(
      (item) => item.type === "image",
    );
    let newMessage: ChatMessage | undefined = undefined;
    if (imageItems.length > 0) {
      // Unfortunately, some models (gpt-4o) do not allow image urls for assistant messages, so we need the role to be user in this case
      const role = o.imageUrlsNeedToBeUser ? "user" : "assistant";
      newMessage = {
        role: role as "user" | "assistant",
        content: imageItems.map((item) => ({
          type: "image_url",
          image_url: {
            url: `data:image/${item.format};base64,${item.content}`,
          },
        })) as ORContentPart[],
      };
    }

    return {
      result: outputText || "[no output]",
      newMessages: newMessage ? [newMessage] : undefined,
    };
  } catch (error) {
    return {
      result: JSON.stringify(
        { error: error instanceof Error ? error.message : "Unknown error" },
        null,
        2,
      ),
    };
  }
};

export const getDetailedDescription = async () => {
  return `Execute Python code that outputs produces text and image output.

The Python code should be self-contained.

A description of the reason that you are executing the code should be provided in the "reasoning" field.

The code will be executed in a Jupyter kernel. The output will be returned as a string.
Any images produced will be returned in the next message.

Assume that relevant libraries are installed and available in the Python environment.
`;
};

export const createToolCallView = (
  toolCall: ORToolCall,
  toolOutput: (ChatMessage & { role: "tool" }) | undefined,
): React.JSX.Element => {
  const args = JSON.parse(toolCall.function.arguments || "{}");
  const reasoning: string = args.reasoning || "";
  return (
    <ToolCall
      kind="script"
      toolName={toolCall.function.name}
      input={args.code || ""}
      inputLanguage="python"
      output={toolOutput ? toolOutput.content : undefined}
      note={reasoning && <MarkdownContent content={reasoning} />}
    />
  );
};

export const requiresPermission = true;

export const isCancelable = true;
