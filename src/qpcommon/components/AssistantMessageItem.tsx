import { FunctionComponent } from "react";
import MarkdownContent from "../components/MarkdownContent";
import { ChatMessage, ORContentPart, QPTool } from "../types";
import AnswerFeedback, { type Feedback } from "./AnswerFeedback";
import ToolCall from "./ToolCall";
import "./Transcript.css";

const AssistantMessageItem: FunctionComponent<{
  message: ChatMessage & { role: "assistant" };
  allToolMessages: ChatMessage[];
  tools: QPTool[];
  inProgress: boolean;
  chatId?: string;
  onFeedbackUpdate?: (feedback: Feedback) => void;
}> = ({ message, allToolMessages, tools, inProgress, onFeedbackUpdate }) => {
  return (
    <div className="chat-answer">
      {message.content && (
        <MarkdownContent
          content={messageContentToString(message.content)}
          doRehypeRaw={!inProgress}
        />
      )}

      {!inProgress && !message.tool_calls && (
        <AnswerFeedback
          feedback={message.feedback}
          onFeedbackUpdate={onFeedbackUpdate}
        />
      )}

      {message.tool_calls?.map((toolCall, index) => {
        const output = allToolMessages.find(
          (m) => m.role === "tool" && m.tool_call_id === toolCall.id,
        );
        if (output && output.role !== "tool") {
          throw new Error("Mismatched tool message role");
        }
        const tool = tools.find(
          (t) => t.toolFunction.name === toolCall.function.name,
        );
        return (
          <div key={index}>
            {tool?.createToolCallView ? (
              tool.createToolCallView(toolCall, output)
            ) : (
              <ToolCall
                kind="tool"
                toolName={toolCall.function.name}
                input={prettyJson(toolCall.function.arguments)}
                output={output ? output.content : undefined}
              />
            )}
          </div>
        );
      })}
    </div>
  );
};

const prettyJson = (text: string) => {
  try {
    return JSON.stringify(JSON.parse(text), null, 2);
  } catch {
    return text;
  }
};

// eslint-disable-next-line react-refresh/only-export-components
export const messageContentToString = (
  content: string | ORContentPart[] | null,
) => {
  if (!content) return "";
  if (typeof content === "string") return content;
  // else it's ORContentPart[]
  return content
    .map((part) => {
      if (part.type === "text") return part.text;
      else if (part.type === "image_url")
        return `![Image](${part.image_url.url})`;
      else return "";
    })
    .join("\n");
};

export default AssistantMessageItem;
