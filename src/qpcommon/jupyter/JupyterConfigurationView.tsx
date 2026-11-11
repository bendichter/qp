import { FunctionComponent, useCallback, useState } from "react";
import {
  Button,
  CodeBlock,
  Dialog,
  Disclosure,
  InlineCode,
  InlineMessage,
  Select,
  TextInput,
  type SelectOption,
} from "@ui";
import { useJupyterConnectivity } from "./JupyterConnectivity";
import { testPythonSession, TestResult } from "./pythonSessionTester";
import { JupyterServer, JupyterServerConfig } from "./types";
import "./JupyterConfigurationView.css";

type JupyterConfigurationViewProps = {
  assistantName: string;
};

type ServerDialog = "add" | "token" | "remove" | null;

const serverLabel = (server: JupyterServer) =>
  server.name ? `${server.url} (${server.name})` : server.url;

const JupyterConfigurationView: FunctionComponent<
  JupyterConfigurationViewProps
> = ({ assistantName }) => {
  const connectivity = useJupyterConnectivity();
  const {
    jupyterServerUrl,
    jupyterServerIsAvailable,
    numActiveKernels,
    refreshJupyter,
    serverConfig,
    setServerConfig,
  } = connectivity;

  const [isTesting, setIsTesting] = useState(false);
  const [testResult, setTestResult] = useState<TestResult | undefined>();
  const [dialog, setDialog] = useState<ServerDialog>(null);
  const [tokenInput, setTokenInput] = useState("");
  const [showToken, setShowToken] = useState(false);
  const [newServerUrl, setNewServerUrl] = useState("");
  const [newServerName, setNewServerName] = useState("");
  const [instructionsOpen, setInstructionsOpen] = useState(false);

  const servers = serverConfig?.servers ?? [];
  const selectedUrl = serverConfig?.selectedServerUrl ?? jupyterServerUrl;
  const currentServer = servers.find((s) => s.url === selectedUrl);
  const serverOptions: SelectOption[] = servers.map((s) => ({
    value: s.url,
    label: serverLabel(s),
  }));
  if (!currentServer)
    serverOptions.unshift({
      value: selectedUrl,
      label: "Choose a server",
      disabled: true,
    });

  const updateConfig = useCallback(
    (change: (config: JupyterServerConfig) => JupyterServerConfig) =>
      setServerConfig((prev) => (prev ? change(prev) : prev)),
    [setServerConfig],
  );

  const handleTest = useCallback(async () => {
    if (!serverConfig) return;
    setIsTesting(true);
    setTestResult(undefined);
    try {
      setTestResult(await testPythonSession(connectivity));
    } catch (error) {
      setTestResult({
        success: false,
        message: error instanceof Error ? error.message : "Unknown error",
      });
    } finally {
      setIsTesting(false);
    }
  }, [connectivity, serverConfig]);

  const handleServerSelect = (url: string) =>
    updateConfig((config) => ({ ...config, selectedServerUrl: url }));

  const handleAddServer = () => {
    if (!newServerUrl) return;
    const newServer: JupyterServer = {
      url: newServerUrl,
      name: newServerName,
      token: "",
      isBuiltIn: false,
    };
    updateConfig((config) => ({
      ...config,
      servers: [...config.servers, newServer],
    }));
    setNewServerUrl("");
    setNewServerName("");
    setDialog(null);
  };

  const handleRemoveConfirm = () => {
    updateConfig((config) => {
      const remaining = config.servers.filter((s) => s.url !== selectedUrl);
      return { servers: remaining, selectedServerUrl: remaining[0]?.url ?? "" };
    });
    setDialog(null);
  };

  const openTokenDialog = () => {
    setTokenInput("");
    setShowToken(false);
    setDialog("token");
  };

  const handleTokenSubmit = () => {
    updateConfig((config) => ({
      ...config,
      servers: config.servers.map((s) =>
        s.url === selectedUrl ? { ...s, token: tokenInput } : s,
      ),
    }));
    setTokenInput("");
    setDialog(null);
  };

  const closeDialog = () => setDialog(null);
  const origin = window.location.origin;
  const kernels = `${numActiveKernels} active ${numActiveKernels === 1 ? "kernel" : "kernels"}`;

  return (
    <section className="jupyter-config" aria-labelledby="jupyter-config-title">
      <h3 id="jupyter-config-title" className="jupyter-config-title">
        Python (Jupyter)
      </h3>
      <p className="jupyter-config-caption">
        {assistantName} runs Python code on a Jupyter server you choose. Nothing
        runs until one is connected.
      </p>

      {jupyterServerIsAvailable ? (
        <InlineMessage status="info">
          Connected to {jupyterServerUrl} · {kernels}
        </InlineMessage>
      ) : (
        <div className="jupyter-config-row">
          <InlineMessage status="warning">
            Not connected. Start a Jupyter server, then Try again.
          </InlineMessage>
          <Button variant="ghost" size="sm" onClick={refreshJupyter}>
            Try again
          </Button>
        </div>
      )}

      <Select
        label="Server"
        value={selectedUrl}
        onChange={handleServerSelect}
        options={serverOptions}
        helper={
          !currentServer
            ? "No server chosen yet."
            : currentServer.token
              ? "Token set. Change it with Set token."
              : "No token."
        }
      />

      <div className="jupyter-config-row">
        {jupyterServerIsAvailable && (
          <Button size="sm" onClick={handleTest} loading={isTesting}>
            Test connection
          </Button>
        )}
        <Button
          variant="ghost"
          size="sm"
          onClick={openTokenDialog}
          disabled={!currentServer}
        >
          Set token
        </Button>
        <Button variant="ghost" size="sm" onClick={() => setDialog("add")}>
          Add server
        </Button>
        {currentServer && !currentServer.isBuiltIn && (
          <Button variant="ghost" size="sm" onClick={() => setDialog("remove")}>
            Remove server
          </Button>
        )}
      </div>
      {testResult && (
        <InlineMessage status={testResult.success ? "info" : "error"}>
          {testResult.message}
        </InlineMessage>
      )}

      <div>
        <Disclosure
          label="How to run a Jupyter server"
          open={instructionsOpen}
          onToggle={setInstructionsOpen}
        >
          <div className="jupyter-config-instructions">
            <p>To run a local Jupyter server, install JupyterLab with pip:</p>
            <CodeBlock language="shell" code="pip install jupyterlab" />
            <p>Then start JupyterLab:</p>
            <CodeBlock language="shell" code={jupyterLabCommand(origin)} />
            <p>
              This allows connections from this page, turns off the token for
              easier access and shuts down idle kernels. Then choose its URL
              and, if needed, set a token above.
            </p>
            <p>
              To connect to JupyterHub (such as DANDI Hub), use the{" "}
              <InlineCode>jupyter-web-proxy</InlineCode> package:
            </p>
            <CodeBlock
              language="shell"
              code={`npx jupyter-web-proxy https://hub.dandiarchive.org/user/<user> -t <token> -o ${origin}`}
            />
            <p>
              Replace <InlineCode>&lt;user&gt;</InlineCode> with your username
              and <InlineCode>&lt;token&gt;</InlineCode> with your JupyterHub
              token. Then choose http://localhost:8010 above. See the{" "}
              <a
                href="https://www.npmjs.com/package/jupyter-web-proxy"
                target="_blank"
                rel="noopener noreferrer"
              >
                jupyter-web-proxy documentation
              </a>
              .
            </p>
          </div>
        </Disclosure>
      </div>

      <Dialog
        open={dialog === "add"}
        onClose={closeDialog}
        title="Add server"
        confirmLabel="Add"
        onConfirm={handleAddServer}
        confirmDisabled={!newServerUrl}
        size="sm"
      >
        <div className="jupyter-config-fields">
          <TextInput
            type="url"
            label="Server URL"
            value={newServerUrl}
            onChange={setNewServerUrl}
            placeholder="http://localhost:8890"
          />
          <TextInput
            label="Name (optional)"
            value={newServerName}
            onChange={setNewServerName}
            placeholder="My server"
          />
        </div>
      </Dialog>
      <Dialog
        open={dialog === "token"}
        onClose={closeDialog}
        title="Set token"
        confirmLabel="Save"
        onConfirm={handleTokenSubmit}
        size="sm"
      >
        <TextInput
          type="password"
          label="Token"
          value={tokenInput}
          onChange={setTokenInput}
          helper={`For ${selectedUrl}`}
          autoComplete="off"
          reveal={{
            shown: showToken,
            onShownChange: setShowToken,
            name: "token",
          }}
        />
      </Dialog>
      <Dialog
        open={dialog === "remove"}
        onClose={closeDialog}
        title="Remove server?"
        confirmLabel="Remove"
        onConfirm={handleRemoveConfirm}
        size="sm"
        kind="destructive"
      >
        <p className="jupyter-config-break">
          {selectedUrl} will be removed from your servers.
        </p>
      </Dialog>
    </section>
  );
};

const jupyterLabCommand = (origin: string) =>
  `jupyter lab --NotebookApp.allow_origin='${origin}' --NotebookApp.token='' --NotebookApp.disable_check_xsrf="True" --no-browser --port=8888 --MappingKernelManager.cull_interval="300" --MappingKernelManager.cull_idle_timeout="300" --MappingKernelManager.cull_connected="True"`;

export default JupyterConfigurationView;
