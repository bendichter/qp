import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import ChatInput from "./ChatInput";
import NewChat from "./NewChat";

const renderInput = (props: Partial<Parameters<typeof ChatInput>[0]>) => {
  const onSubmit = vi.fn();
  render(
    <ChatInput
      label="Ask Neurosift Chat"
      value="Hello"
      onChange={() => {}}
      onSubmit={onSubmit}
      {...props}
    />,
  );
  return {
    onSubmit,
    field: screen.getByRole("textbox", { name: "Ask Neurosift Chat" }),
  };
};

describe("ChatInput", () => {
  it("sends on Enter and leaves Shift+Enter and composing to the field", () => {
    const { onSubmit, field } = renderInput({});
    expect(fireEvent.keyDown(field, { key: "Enter", shiftKey: true })).toBe(
      true,
    );
    fireEvent.keyDown(field, { key: "Enter", isComposing: true });
    expect(onSubmit).not.toHaveBeenCalled();
    fireEvent.keyDown(field, { key: "Enter" });
    expect(onSubmit).toHaveBeenCalledTimes(1);
  });

  it("describes the field with the keyboard helper", () => {
    const { field } = renderInput({});
    expect(field).toHaveAccessibleDescription(
      "Enter to send, Shift+Enter for a new line",
    );
  });

  it("turns Send off while empty", () => {
    renderInput({ value: "  " });
    expect(screen.getByRole("button", { name: "Send" })).toBeDisabled();
  });

  it("keeps the field typable while the assistant works, with Send off", () => {
    const { onSubmit, field } = renderInput({ working: true });
    expect(field).toBeEnabled();
    expect(screen.getByRole("button", { name: "Send" })).toBeDisabled();
    fireEvent.keyDown(field, { key: "Enter" });
    expect(onSubmit).not.toHaveBeenCalled();
  });
});

describe("NewChat", () => {
  it("shows the title and lead, holds the message box and sends a chosen prompt", () => {
    const onPrompt = vi.fn();
    render(
      <NewChat
        title="Ask Test Chat"
        lead="Assistant for testing qp."
        prompts={["a", "b", "c", "d", "e"]}
        onPrompt={onPrompt}
      >
        <p>Message box</p>
      </NewChat>,
    );
    expect(screen.getByRole("heading", { name: "Ask Test Chat" })).toBeTruthy();
    expect(screen.getByText("Assistant for testing qp.")).toBeTruthy();
    expect(screen.getByText("Message box")).toBeTruthy();
    const list = screen.getByRole("list", { name: "Suggested prompts" });
    expect(list.querySelectorAll("button")).toHaveLength(4);
    fireEvent.click(screen.getByRole("button", { name: "b" }));
    expect(onPrompt).toHaveBeenCalledWith("b");
  });

  it("leaves out the prompts heading when there are none", () => {
    render(
      <NewChat title="Ask Test Chat" prompts={[]} onPrompt={() => {}}>
        <p>Message box</p>
      </NewChat>,
    );
    expect(screen.queryByText("Suggested prompts")).toBeNull();
  });
});
