import { Button, TextArea } from "@ui";
import {
  FunctionComponent,
  useCallback,
  useId,
  type FormEvent,
  type KeyboardEvent,
} from "react";
import "./ChatInput.css";

interface ChatInputProps {
  label: string;
  value: string;
  onChange: (value: string) => void;
  onSubmit: () => void;
  /** Locks the field, for a stopped chat, an error or a missing API key. */
  disabled?: boolean;
  /** The assistant is answering: the field stays typable and Send is off. */
  working?: boolean;
}

const ChatInput: FunctionComponent<ChatInputProps> = ({
  label,
  value,
  onChange,
  onSubmit,
  disabled = false,
  working = false,
}) => {
  const helperId = useId();
  const canSend = value.trim() !== "" && !disabled && !working;

  const send = useCallback(() => {
    if (canSend) onSubmit();
  }, [canSend, onSubmit]);

  const sendOnEnter = useCallback(
    (event: KeyboardEvent<HTMLTextAreaElement>) => {
      if (
        event.key !== "Enter" ||
        event.shiftKey ||
        event.nativeEvent.isComposing
      )
        return;
      event.preventDefault();
      send();
    },
    [send],
  );

  const submit = useCallback(
    (event: FormEvent) => {
      event.preventDefault();
      send();
    },
    [send],
  );

  return (
    <form className="chat-input" onSubmit={submit}>
      <div className="chat-input-row">
        <TextArea
          label={label}
          hideLabel
          placeholder={label}
          size="lg"
          aria-describedby={helperId}
          value={value}
          onChange={onChange}
          onKeyDown={sendOnEnter}
          rows={1}
          maxRows={8}
          disabled={disabled}
        />
        <Button type="submit" variant="primary" size="lg" disabled={!canSend}>
          Send
        </Button>
      </div>
      <p id={helperId} className="chat-input-helper">
        Enter to send, Shift+Enter for a new line
      </p>
    </form>
  );
};

export default ChatInput;
