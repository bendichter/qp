import { FunctionComponent, useState } from "react";
import ModelSelectionDialog from "./ModelSelectionDialog";
import "./UsageDisplay.css";

interface UsageDisplayProps {
  model: string;
  setModel: (model: string) => void;
  totalUsage: {
    promptTokens: number;
    completionTokens: number;
    estimatedCost: number;
  };
}

const UsageDisplay: FunctionComponent<UsageDisplayProps> = ({
  model,
  setModel,
  totalUsage,
}) => {
  const [isDialogOpen, setIsDialogOpen] = useState(false);

  const formatTokens = (tokens: number): string => {
    return tokens.toLocaleString();
  };

  const formatCost = (cost: number): string => {
    return `$${cost.toFixed(3)}`;
  };

  return (
    <>
      <p className="usage-display">
        <button
          type="button"
          className="usage-display-model"
          onClick={() => setIsDialogOpen(true)}
        >
          {model}
        </button>{" "}
        • {formatTokens(totalUsage.promptTokens)} in •{" "}
        {formatTokens(totalUsage.completionTokens)} out •{" "}
        {formatCost(totalUsage.estimatedCost)}
      </p>
      <ModelSelectionDialog
        isOpen={isDialogOpen}
        onClose={() => setIsDialogOpen(false)}
        currentModel={model}
        onSelectModel={setModel}
      />
    </>
  );
};

export default UsageDisplay;
