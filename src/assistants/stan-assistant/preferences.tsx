import { useMemo } from "react";
import { Preferences } from "../../qpcommon/MainWindow";
import stanAssistantSystemPrompt from "./stanAssistantSystemPrompt";
import { getDocPages } from "./retrieveStanDocs";

// eslint-disable-next-line react-refresh/only-export-components
const AssistantDisplayInfo = () => {
  const stanUrl = "https://mc-stan.org/";
  const stanUsersGuideUrl =
    "https://mc-stan.org/docs/stan-users-guide/index.html";
  const stanReferenceManualUrl = "https://mc-stan.org/docs/reference-manual/";
  const docPages = useMemo(() => getDocPages(), []);
  return (
    <div style={{ maxWidth: "600px", margin: "0 auto" }}>
      <p>
        This is a technical assistant for{" "}
        <a href={stanUrl} target="_blank" rel="noopener noreferrer">
          Stan
        </a>{" "}
        that provides guidance, troubleshooting, and explanations based on the
        official{" "}
        <a href={stanUsersGuideUrl} target="_blank" rel="noopener noreferrer">
          Stan User's Guide
        </a>{" "}
        and a condensed version of the{" "}
        <a
          href={stanReferenceManualUrl}
          target="_blank"
          rel="noopener noreferrer"
        >
          Stan Reference Manual
        </a>
        .
      </p>
      <p>
        {docPages.map((doc, index) => (
          <span key={doc.url}>
            <a href={doc.url} target="_blank" rel="noopener noreferrer">
              {doc.title}
            </a>
            {index < docPages.length - 1 ? " | " : ""}
          </span>
        ))}
      </p>
      .
    </div>
  );
};

const preferences: Preferences = {
  assistantName: "Stan Assistant",
  getAssistantSystemPrompt: async () => stanAssistantSystemPrompt,
  assistantDisplayInfo: <AssistantDisplayInfo />,
  suggestedPrompts: [
    "Give an overview of Stan's modeling language.",
    "Provide an example Stan model for linear regression.",
    "Provide an interactive example using Stan Playground.",
  ],
  requiresJupyter: false,
};

export default preferences;
