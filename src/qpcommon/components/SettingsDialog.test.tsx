// @vitest-environment jsdom
import {
  cleanup,
  fireEvent,
  render,
  screen,
  within,
} from "@testing-library/react";
import {
  afterEach,
  beforeAll,
  beforeEach,
  describe,
  expect,
  it,
  vi,
} from "vitest";
import { ToastProvider } from "@ui";
import SettingsDialog from "./SettingsDialog";
import { Preferences } from "../MainWindow";
import {
  JupyterConnectivityContext,
  type JupyterConnectivityState,
} from "../jupyter/JupyterConnectivity";

// jsdom has no modal dialogs or popovers; these stand in for them.
beforeAll(() => {
  HTMLElement.prototype.showPopover = function () {};
  HTMLDialogElement.prototype.showModal = function () {
    this.setAttribute("open", "");
  };
  HTMLDialogElement.prototype.close = function () {
    if (!this.hasAttribute("open")) return;
    this.removeAttribute("open");
    this.dispatchEvent(new Event("close"));
  };
});
beforeEach(() => localStorage.clear());
afterEach(cleanup);

const preferences = (requiresJupyter: boolean) =>
  ({ assistantName: "Dandiset Explorer", requiresJupyter }) as Preferences;

const connectivity: JupyterConnectivityState = {
  mode: "jupyter-server",
  jupyterServerUrl: "http://localhost:8888",
  jupyterServerToken: "",
  jupyterServerIsAvailable: false,
  refreshJupyter: vi.fn(),
  setJupyterServerUrl: vi.fn(),
  setJupyterServerToken: vi.fn(),
  numActiveKernels: 0,
  serverConfig: {
    selectedServerUrl: "http://localhost:8888",
    servers: [
      { url: "http://localhost:8888", name: "", token: "", isBuiltIn: true },
    ],
  },
  setServerConfig: vi.fn(),
};

const setup = (requiresJupyter = false) => {
  const onClose = vi.fn();
  render(
    <ToastProvider>
      <JupyterConnectivityContext.Provider value={connectivity}>
        <SettingsDialog
          preferences={preferences(requiresJupyter)}
          isOpen
          onClose={onClose}
        />
      </JupyterConnectivityContext.Provider>
    </ToastProvider>,
  );
  return {
    onClose,
    field: screen.getByLabelText("OpenRouter API key"),
    save: screen.getByRole("button", { name: "Save" }),
  };
};

describe("SettingsDialog", () => {
  it("describes the key field and hides the key until Show API key is pressed", () => {
    const { field } = setup();
    expect(field).toHaveAccessibleDescription(
      "Needed for premium models. Get a key at openrouter.ai/keys. Saved in this browser only.",
    );
    expect(field).toHaveAttribute("type", "password");
    fireEvent.click(screen.getByRole("button", { name: "Show API key" }));
    expect(field).toHaveAttribute("type", "text");
    fireEvent.click(screen.getByRole("button", { name: "Hide API key" }));
    expect(field).toHaveAttribute("type", "password");
  });

  it("keeps Save off until a key is typed, then saves it", () => {
    const { field, save, onClose } = setup();
    expect(save).toBeDisabled();
    fireEvent.change(field, { target: { value: "  sk-or-v1-test1234  " } });
    expect(save).toBeEnabled();
    fireEvent.click(save);
    expect(localStorage.getItem("openrouter_api_key")).toBe(
      "sk-or-v1-test1234",
    );
    expect(screen.getByText("API key saved")).toBeInTheDocument();
    expect(onClose).toHaveBeenCalled();
  });

  it("removes the saved key", () => {
    localStorage.setItem("openrouter_api_key", "sk-or-v1-test1234");
    const { field } = setup();
    expect(screen.getByText("Saved key: sk-or-...1234")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Remove key" }));
    expect(localStorage.getItem("openrouter_api_key")).toBeNull();
    expect(field).toHaveValue("");
    expect(screen.queryByText(/Saved key/)).not.toBeInTheDocument();
    expect(screen.getByText("API key removed")).toBeInTheDocument();
  });

  it("shows the Python section only for assistants that need Jupyter", () => {
    setup();
    expect(screen.queryByText("Python (Jupyter)")).not.toBeInTheDocument();
    cleanup();
    setup(true);
    expect(screen.getByText("Python (Jupyter)")).toBeInTheDocument();
  });

  it("closes Add server, by Cancel or Escape, without closing Settings", () => {
    const { onClose } = setup(true);
    fireEvent.click(screen.getByRole("button", { name: "Add server" }));
    const add = screen.getByRole("dialog", { name: "Add server" });
    expect(within(add).getByRole("button", { name: "Add" })).toBeDisabled();
    fireEvent.click(within(add).getByRole("button", { name: "Cancel" }));
    expect(screen.queryByRole("dialog", { name: "Add server" })).toBeNull();
    fireEvent.click(screen.getByRole("button", { name: "Add server" }));
    const escape = new Event("cancel", { cancelable: true });
    fireEvent(screen.getByRole("dialog", { name: "Add server" }), escape);
    expect(screen.queryByRole("dialog", { name: "Add server" })).toBeNull();
    expect(onClose).not.toHaveBeenCalled();
  });
});
