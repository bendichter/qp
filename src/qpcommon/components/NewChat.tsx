import { PromptList } from "@ui";
import { FunctionComponent, ReactNode, useId } from "react";
import "./NewChat.css";

const MAX_PROMPTS = 4;

interface NewChatProps {
  title: string;
  lead?: ReactNode;
  prompts: string[];
  onPrompt: (prompt: string) => void;
  /** The message box, between the title and the prompts. */
  children: ReactNode;
}

/** A new chat, laid out like Neurosift's Home: title, message box, then prompts. */
const NewChat: FunctionComponent<NewChatProps> = ({
  title,
  lead,
  prompts,
  onPrompt,
  children,
}) => {
  const titleId = useId();
  const promptsId = useId();
  const shown = prompts.slice(0, MAX_PROMPTS);
  return (
    <section className="new-chat" aria-labelledby={titleId}>
      <div className="new-chat-hero">
        <h2 id={titleId} className="new-chat-title">
          {title}
        </h2>
        {lead && <div className="new-chat-lead">{lead}</div>}
      </div>
      {children}
      {shown.length > 0 && (
        <section className="new-chat-prompts" aria-labelledby={promptsId}>
          <h3 id={promptsId} className="new-chat-prompts-title">
            Suggested prompts
          </h3>
          <PromptList
            label="Suggested prompts"
            items={shown.map((text) => ({ id: text, text }))}
            onSelect={(item) => onPrompt(item.text)}
          />
        </section>
      )}
    </section>
  );
};

export default NewChat;
