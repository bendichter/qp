/* eslint-disable @typescript-eslint/no-explicit-any */
import { ORToolCall } from "../../../qpcommon/completion/openRouterTypes";
import { ChatMessage, QPFunctionDescription } from "../../../qpcommon/types";
import { JobRunnerClient } from "./jobRunnerClient";
import ToolCall from "../../../qpcommon/components/ToolCall";

export const toolFunction: QPFunctionDescription = {
  name: "execute_javascript",
  description: "Execute a JavaScript script for probing databases",
  parameters: {
    type: "object",
    properties: {
      script: {
        type: "string",
        description: "JavaScript code to execute",
      },
    },
    required: ["script"],
  },
};

// Singleton instance of JobRunnerClient
let jobRunnerClient: JobRunnerClient | null = null;

const getJobRunner = () => {
  if (!jobRunnerClient) {
    jobRunnerClient = new JobRunnerClient();
  }
  return jobRunnerClient;
};

type ExecuteJavaScriptParams = {
  script: string;
};

export const execute = async (
  params: ExecuteJavaScriptParams,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  _o: any,
): Promise<{ result: string }> => {
  const { script } = params;

  console.info("Executing script:");
  console.info(script);

  try {
    const scriptOutput = await getJobRunner().executeScript(script);

    console.info("Script output:");
    console.info(scriptOutput);
    return { result: scriptOutput };
  } catch (error) {
    console.error("Error executing script:", error);
    return {
      result: `Script execution failed: ${error instanceof Error ? error.message : String(error)}`,
    };
  }
};

export const getDetailedDescription = async () => {
  return `Execute a JavaScript script for probing databases`;
};

export const requiresPermission = false;

export const createToolCallView = (
  toolCall: ORToolCall,
  toolOutput: (ChatMessage & { role: "tool" }) | undefined,
): React.JSX.Element => {
  const args = JSON.parse(toolCall.function.arguments || "{}");
  return (
    <ToolCall
      kind="script"
      toolName={toolCall.function.name}
      input={args.script || ""}
      inputLanguage="javascript"
      output={toolOutput ? toolOutput.content : undefined}
    />
  );
};
