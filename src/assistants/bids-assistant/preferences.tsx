import { useMemo } from "react";
import { Preferences } from "../../qpcommon/MainWindow";
import bidsAssistantSystemPrompt from "./bidsAssistantSystemPrompt";
import { getDocPages } from "./retrieveBidsDocs";

// eslint-disable-next-line react-refresh/only-export-components
const AssistantDisplayInfo = () => {
  const bidsUrl = "https://bids.neuroimaging.io/";
  const bidsSpecUrl = "https://bids-specification.readthedocs.io/";
  const bidsGithubUrl = "https://github.com/bids-standard/bids-specification";
  const bidsExamplesUrl = "https://github.com/bids-standard/bids-examples";
  const docPages = useMemo(() => getDocPages(), []);
  return (
    <div style={{ maxWidth: "600px", margin: "0 auto" }}>
      <p>
        This is a technical assistant for the{" "}
        <a href={bidsUrl} target="_blank" rel="noopener noreferrer">
          Brain Imaging Data Structure (BIDS)
        </a>{" "}
        that provides guidance, troubleshooting, and explanations based on the
        official{" "}
        <a href={bidsSpecUrl} target="_blank" rel="noopener noreferrer">
          BIDS Specification
        </a>
        .
      </p>
      <p>
        Additional resources:{" "}
        <a href={bidsGithubUrl} target="_blank" rel="noopener noreferrer">
          BIDS Specification Source
        </a>{" "}
        |{" "}
        <a href={bidsExamplesUrl} target="_blank" rel="noopener noreferrer">
          BIDS Examples
        </a>
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
    </div>
  );
};

const preferences: Preferences = {
  assistantName: "BIDS Assistant",
  getAssistantSystemPrompt: async () => bidsAssistantSystemPrompt,
  assistantDisplayInfo: <AssistantDisplayInfo />,
  suggestedPrompts: [
    "Explain the basic structure of a BIDS dataset.",
    "How do I name functional MRI files in BIDS?",
    "What metadata is required for task fMRI in the JSON sidecar?",
    "Show me an example of a participants.tsv file.",
  ],
  requiresJupyter: false,
};

export default preferences;
