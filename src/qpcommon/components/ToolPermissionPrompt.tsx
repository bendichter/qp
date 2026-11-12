import { Alert } from "@ui";
import { FunctionComponent } from "react";

interface ToolPermissionPromptProps {
  assistantName: string;
  toolName: string;
  /** A script tool reads "wants to run a script". */
  isScript: boolean;
  onAllow: () => void;
  onDeny: () => void;
}

const ToolPermissionPrompt: FunctionComponent<ToolPermissionPromptProps> = ({
  assistantName,
  toolName,
  isScript,
  onAllow,
  onDeny,
}) => (
  <Alert
    status="warning"
    title={
      isScript
        ? `${assistantName} wants to run a script`
        : `${assistantName} wants to use ${toolName}`
    }
    actions={[
      { label: "Allow", onClick: onAllow, primary: true },
      { label: "Deny", onClick: onDeny },
    ]}
  >
    <p>
      The assistant wants to use the tool: <strong>{toolName}</strong>
    </p>
  </Alert>
);

export default ToolPermissionPrompt;
