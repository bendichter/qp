import { Disclosure, Spinner } from "@ui";
import { FunctionComponent, ReactNode, useState } from "react";
import Code from "./Code";
import "./Transcript.css";

interface ToolCallProps {
  toolName: string;
  /** A script reads "Ran a script"; any other tool reads "Used". */
  kind: "script" | "tool";
  input: string;
  inputLanguage?: string;
  /** Undefined while the tool runs. */
  output: string | undefined;
  /** Text shown above the input, such as the assistant's reasoning. */
  note?: ReactNode;
}

/** One tool call in the transcript: a closed Disclosure that opens to its input and output. */
const ToolCall: FunctionComponent<ToolCallProps> = ({
  toolName,
  kind,
  input,
  inputLanguage,
  output,
  note,
}) => {
  const [open, setOpen] = useState(false);
  const script = kind === "script";
  if (output === undefined) {
    return (
      <p className="chat-tool-running" role="status">
        <Spinner />
        {script ? `Running a script · ${toolName}` : `Using ${toolName}`}
      </p>
    );
  }
  return (
    <div className="chat-tool-call">
      <Disclosure
        label={script ? `Ran a script · ${toolName}` : `Used ${toolName}`}
        open={open}
        onToggle={setOpen}
      >
        <div className="chat-tool-panel">
          {note}
          {input && (
            <Code
              code={input}
              language={inputLanguage}
              title={script ? "Script" : "Input"}
            />
          )}
          {output && <Code code={output.trimEnd()} title="Output" />}
        </div>
      </Disclosure>
    </div>
  );
};

export default ToolCall;
