import { FunctionComponent, useEffect, useId, useState } from "react";
import { Button, Dialog, TextInput, useToast } from "@ui";
import {
  getStoredApiKey,
  setStoredApiKey,
  clearStoredApiKey,
  maskApiKey,
} from "../utils/apiKeyStorage";
import JupyterConfigurationView from "../jupyter/JupyterConfigurationView";
import { Preferences } from "../MainWindow";
import "./SettingsDialog.css";

interface SettingsDialogProps {
  preferences: Preferences;
  isOpen: boolean;
  onClose: () => void;
}

const SettingsDialog: FunctionComponent<SettingsDialogProps> = ({
  preferences,
  isOpen,
  onClose,
}) => {
  const toast = useToast();
  const [apiKey, setApiKey] = useState("");
  const [showApiKey, setShowApiKey] = useState(false);
  const [storedKey, setStoredKey] = useState<string | null>(null);
  const helperId = useId();

  useEffect(() => {
    if (!isOpen) return;
    const stored = getStoredApiKey();
    setStoredKey(stored);
    setApiKey(stored ?? "");
    setShowApiKey(false);
  }, [isOpen]);

  const handleSave = () => {
    if (!apiKey.trim()) return;
    setStoredApiKey(apiKey.trim());
    toast.show({ message: "API key saved", status: "success" });
    onClose();
  };

  const handleRemove = () => {
    clearStoredApiKey();
    setStoredKey(null);
    setApiKey("");
    toast.show({ message: "API key removed" });
  };

  return (
    <Dialog
      open={isOpen}
      onClose={onClose}
      title="Settings"
      confirmLabel="Save"
      onConfirm={handleSave}
      confirmDisabled={!apiKey.trim()}
    >
      <div className="settings-key">
        <TextInput
          type="password"
          label="OpenRouter API key"
          value={apiKey}
          onChange={setApiKey}
          placeholder="sk-or-v1-..."
          autoComplete="off"
          spellCheck={false}
          aria-describedby={helperId}
          reveal={{
            shown: showApiKey,
            onShownChange: setShowApiKey,
            name: "API key",
          }}
        />
        <p id={helperId} className="settings-caption">
          Needed for premium models. Get a key at{" "}
          <a
            href="https://openrouter.ai/keys"
            target="_blank"
            rel="noopener noreferrer"
          >
            openrouter.ai/keys
          </a>
          . Saved in this browser only.
        </p>
        {storedKey && (
          <div className="settings-saved-key">
            <p className="settings-caption">
              Saved key: {maskApiKey(storedKey)}
            </p>
            <Button variant="ghost" size="sm" onClick={handleRemove}>
              Remove key
            </Button>
          </div>
        )}
      </div>
      {preferences.requiresJupyter && (
        <JupyterConfigurationView assistantName={preferences.assistantName} />
      )}
    </Dialog>
  );
};

export default SettingsDialog;
