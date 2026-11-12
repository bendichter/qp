import { Button } from "@ui";
import { FunctionComponent } from "react";
import { ORContentPart } from "../types";
import MarkdownContent from "./MarkdownContent";
import "./Transcript.css";

interface QuestionItemProps {
  content: string | ORContentPart[];
  onDelete: () => void;
}

/** The person's message: a right-aligned bubble, labeled "You" for screen readers. */
const QuestionItem: FunctionComponent<QuestionItemProps> = ({
  content,
  onDelete,
}) => (
  <div className="chat-question message-user">
    <div className="chat-question-bubble">
      <span className="ns-visually-hidden">You: </span>
      {typeof content === "string"
        ? content
        : content.map((part, index) => {
            if (part.type === "text")
              return <MarkdownContent key={index} content={part.text} />;
            if (part.type === "image_url")
              return (
                <img
                  key={index}
                  className="chat-question-image"
                  src={part.image_url.url}
                  alt="Content"
                />
              );
            return null;
          })}
    </div>
    {typeof content === "string" && (
      <div className="chat-question-actions">
        <Button
          variant="ghost"
          size="sm"
          title="Delete this message and all messages after it"
          onClick={onDelete}
        >
          Delete
        </Button>
      </div>
    )}
  </div>
);

export default QuestionItem;
