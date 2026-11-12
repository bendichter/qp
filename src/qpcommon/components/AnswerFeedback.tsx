import { Button, TextArea } from "@ui";
import { FunctionComponent, useState, type FormEvent } from "react";
import "./Transcript.css";

export type Feedback = { thumbs?: "up" | "down"; comment?: string };

const CHOICES = [
  { thumbs: "up", label: "Helpful" },
  { thumbs: "down", label: "Not helpful" },
] as const;

interface AnswerFeedbackProps {
  feedback: Feedback | undefined;
  onFeedbackUpdate?: (feedback: Feedback) => void;
}

/** Helpful and Not helpful toggles under an answer, then an optional comment. */
const AnswerFeedback: FunctionComponent<AnswerFeedbackProps> = ({
  feedback,
  onFeedbackUpdate,
}) => {
  const [editing, setEditing] = useState(false);
  const [commentText, setCommentText] = useState(feedback?.comment || "");

  const edit = () => {
    setCommentText(feedback?.comment || "");
    setEditing(true);
  };

  const choose = (thumbs: "up" | "down") => {
    if (feedback?.thumbs === thumbs) return edit();
    setEditing(false);
    setCommentText("");
    onFeedbackUpdate?.({ thumbs, comment: "" });
  };

  const submit = (event: FormEvent) => {
    event.preventDefault();
    onFeedbackUpdate?.({
      thumbs: feedback?.thumbs,
      comment: commentText.trim() || undefined,
    });
    setEditing(false);
  };

  const cancel = () => {
    setCommentText(feedback?.comment || "");
    setEditing(false);
  };

  const clear = () => {
    onFeedbackUpdate?.({ thumbs: undefined, comment: undefined });
    setEditing(false);
    setCommentText("");
  };

  return (
    <div className="chat-feedback">
      <div className="chat-feedback-row">
        {CHOICES.map(({ thumbs, label }) => (
          <Button
            key={thumbs}
            variant="secondary"
            size="sm"
            pressed={feedback?.thumbs === thumbs}
            onClick={() => choose(thumbs)}
          >
            {label}
          </Button>
        ))}
        {feedback?.thumbs && !feedback.comment && !editing && (
          <p className="chat-feedback-note">
            Thanks.{" "}
            <button type="button" className="chat-link-button" onClick={edit}>
              Add a comment?
            </button>
          </p>
        )}
        {(feedback?.thumbs || feedback?.comment) && (
          <Button variant="ghost" size="sm" onClick={clear}>
            Clear feedback
          </Button>
        )}
      </div>

      {editing && (
        <form className="chat-feedback-form" onSubmit={submit}>
          <TextArea
            label="Comment"
            hideLabel
            placeholder="Optional: Add a comment about this response..."
            value={commentText}
            onChange={setCommentText}
            autoFocus
          />
          <div className="chat-feedback-row">
            <Button type="submit" variant="primary" size="sm">
              Submit
            </Button>
            <Button variant="ghost" size="sm" onClick={cancel}>
              Cancel
            </Button>
          </div>
        </form>
      )}

      {!editing && feedback?.comment && (
        <p className="chat-feedback-note">
          Your comment: {feedback.comment}{" "}
          <button type="button" className="chat-link-button" onClick={edit}>
            Edit comment
          </button>
        </p>
      )}
    </div>
  );
};

export default AnswerFeedback;
