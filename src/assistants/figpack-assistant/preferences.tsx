import { Preferences } from "../../qpcommon/MainWindow";
import figpackAssistantSystemPrompt from "./figpackAssistantSystemPrompt";

// eslint-disable-next-line react-refresh/only-export-components
const AssistantDisplayInfo = () => {
  const figpackDocsUrl = "https://flatironinstitute.github.io/figpack/";
  return (
    <div style={{ maxWidth: "600px", margin: "0 auto" }}>
      <p>
        This is a technical assistant for figpack that has access to the{" "}
        <a href={figpackDocsUrl} target="_blank" rel="noopener noreferrer">
          figpack documentation
        </a>
        .
      </p>
    </div>
  );
};

const preferences: Preferences = {
  assistantName: "Figpack Assistant",
  getAssistantSystemPrompt: async () => figpackAssistantSystemPrompt,
  assistantDisplayInfo: <AssistantDisplayInfo />,
  suggestedPrompts: [],
  requiresJupyter: false,
};

export default preferences;
