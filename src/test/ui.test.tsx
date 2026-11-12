import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { Button } from "@ui";

describe("@ui", () => {
  it("resolves the Neurosift components", () => {
    render(<Button>Send</Button>);
    expect(screen.getByRole("button", { name: "Send" })).toHaveClass(
      "ns-button",
    );
  });
});
