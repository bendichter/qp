import { useMemo } from "react";
import { Preferences } from "../../qpcommon/MainWindow";
import repronimAssistantSystemPrompt from "./repronimAssistantSystemPrompt";
import { getDocPages } from "./retrieveRepronimDocs";

// eslint-disable-next-line react-refresh/only-export-components
const AssistantDisplayInfo = () => {
  const repronimUrl = "https://repronim.org/";
  const repronimGithubUrl = "https://github.com/ReproNim";
  const heudiconvUrl = "https://heudiconv.readthedocs.io/";
  const dataladUrl = "https://www.datalad.org/";
  const neurodockerUrl = "https://github.com/ReproNim/neurodocker";
  const docPages = useMemo(() => getDocPages(), []);
  return (
    <div style={{ maxWidth: "600px", margin: "0 auto" }}>
      <p>
        This is a technical assistant for{" "}
        <a href={repronimUrl} target="_blank" rel="noopener noreferrer">
          ReproNim
        </a>{" "}
        (Reproducible Neuroimaging) that provides guidance, troubleshooting, and
        explanations for reproducible neuroimaging workflows and tools.
      </p>
      <p>
        Key tools:{" "}
        <a href={heudiconvUrl} target="_blank" rel="noopener noreferrer">
          HeuDiConv
        </a>{" "}
        |{" "}
        <a href={dataladUrl} target="_blank" rel="noopener noreferrer">
          DataLad
        </a>{" "}
        |{" "}
        <a href={neurodockerUrl} target="_blank" rel="noopener noreferrer">
          Neurodocker
        </a>{" "}
        |{" "}
        <a href={repronimGithubUrl} target="_blank" rel="noopener noreferrer">
          GitHub
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
  assistantName: "ReproNim Assistant",
  getAssistantSystemPrompt: async () => repronimAssistantSystemPrompt,
  assistantDisplayInfo: <AssistantDisplayInfo />,
  suggestedPrompts: [
    "How do I convert DICOM files to BIDS using HeuDiConv?",
    "What is DataLad and how can it help with data management?",
    "How do I create a reproducible neuroimaging container with Neurodocker?",
    "What is the ReproIn convention for scanner setup?",
  ],
  requiresJupyter: false,
};

export default preferences;
