import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { DictionaryEditor } from "./DictionaryEditor";

const defaultProps = {
  label: "Task Statuses",
  values: ["Todo", "In Progress", "Done"],
  onSave: vi.fn(),
  isSaving: false,
};

describe("DictionaryEditor — view mode", () => {
  it("renders an edit icon button with accessible name containing the label", () => {
    render(<DictionaryEditor {...defaultProps} />);

    expect(screen.getByRole("button", { name: "Edit Task Statuses" })).toBeInTheDocument();
  });

  it("does not render chip remove buttons in view mode", () => {
    render(<DictionaryEditor {...defaultProps} />);

    // Remove buttons are only present during edit mode
    expect(screen.queryByRole("button", { name: /Remove/ })).toBeNull();
  });

  it("does not render Clear override button when onClearOverride is not provided", () => {
    render(<DictionaryEditor {...defaultProps} />);

    expect(screen.queryByRole("button", { name: /Clear override/ })).toBeNull();
  });

  it("renders Clear override button when onClearOverride is provided", () => {
    render(
      <DictionaryEditor
        {...defaultProps}
        onClearOverride={vi.fn()}
      />
    );

    expect(
      screen.getByRole("button", { name: "Clear override for Task Statuses" })
    ).toBeInTheDocument();
  });

  it("Clear override button is enabled when isClearingOverride is false", () => {
    render(
      <DictionaryEditor
        {...defaultProps}
        onClearOverride={vi.fn()}
        isClearingOverride={false}
      />
    );

    const btn = screen.getByRole("button", { name: "Clear override for Task Statuses" });
    expect(btn).not.toBeDisabled();
  });

  it("Clear override button is disabled while isClearingOverride is true (in-flight)", () => {
    render(
      <DictionaryEditor
        {...defaultProps}
        onClearOverride={vi.fn()}
        isClearingOverride={true}
      />
    );

    const btn = screen.getByRole("button", { name: "Clear override for Task Statuses" });
    expect(btn).toBeDisabled();
  });

  it("calls onClearOverride when Clear override button is clicked", async () => {
    const handleClear = vi.fn();
    render(
      <DictionaryEditor
        {...defaultProps}
        onClearOverride={handleClear}
        isClearingOverride={false}
      />
    );

    await userEvent.click(
      screen.getByRole("button", { name: "Clear override for Task Statuses" })
    );

    expect(handleClear).toHaveBeenCalledTimes(1);
  });

  it("does NOT call onClearOverride when the button is disabled (in-flight)", async () => {
    const handleClear = vi.fn();
    render(
      <DictionaryEditor
        {...defaultProps}
        onClearOverride={handleClear}
        isClearingOverride={true}
      />
    );

    await userEvent.click(
      screen.getByRole("button", { name: "Clear override for Task Statuses" })
    );

    expect(handleClear).not.toHaveBeenCalled();
  });
});

describe("DictionaryEditor — entering edit mode", () => {
  it("clicking the edit icon button switches to edit mode", async () => {
    render(<DictionaryEditor {...defaultProps} />);

    await userEvent.click(screen.getByRole("button", { name: "Edit Task Statuses" }));

    // In edit mode the working list is shown with chip remove buttons
    expect(screen.getByRole("button", { name: "Remove Todo from Task Statuses" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Remove In Progress from Task Statuses" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Remove Done from Task Statuses" })).toBeInTheDocument();
  });

  it("the Edit button disappears once edit mode is active", async () => {
    render(<DictionaryEditor {...defaultProps} />);

    await userEvent.click(screen.getByRole("button", { name: "Edit Task Statuses" }));

    expect(screen.queryByRole("button", { name: "Edit Task Statuses" })).toBeNull();
  });
});

describe("DictionaryEditor — chip remove buttons", () => {
  it("chip remove buttons carry accessible names referencing both value and label", async () => {
    render(<DictionaryEditor {...defaultProps} />);
    await userEvent.click(screen.getByRole("button", { name: "Edit Task Statuses" }));

    // Each chip remove button name follows: "Remove {value} from {label}"
    expect(
      screen.getByRole("button", { name: "Remove Todo from Task Statuses" })
    ).toBeInTheDocument();
  });

  it("clicking a chip remove button removes that value from the working list", async () => {
    render(<DictionaryEditor {...defaultProps} />);
    await userEvent.click(screen.getByRole("button", { name: "Edit Task Statuses" }));

    await userEvent.click(
      screen.getByRole("button", { name: "Remove In Progress from Task Statuses" })
    );

    // "In Progress" chip should no longer be in the working list
    expect(
      screen.queryByRole("button", { name: "Remove In Progress from Task Statuses" })
    ).toBeNull();

    // Other chips are still present
    expect(screen.getByRole("button", { name: "Remove Todo from Task Statuses" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Remove Done from Task Statuses" })).toBeInTheDocument();
  });

  it("removing a chip does not affect the neighbouring chips", async () => {
    render(<DictionaryEditor {...defaultProps} />);
    await userEvent.click(screen.getByRole("button", { name: "Edit Task Statuses" }));

    await userEvent.click(
      screen.getByRole("button", { name: "Remove Todo from Task Statuses" })
    );

    expect(screen.getByRole("button", { name: "Remove In Progress from Task Statuses" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Remove Done from Task Statuses" })).toBeInTheDocument();
  });
});

describe("DictionaryEditor — save / cancel", () => {
  it("calls onSave with the current working list when Save is clicked", async () => {
    const handleSave = vi.fn();
    render(<DictionaryEditor {...defaultProps} onSave={handleSave} />);

    await userEvent.click(screen.getByRole("button", { name: "Edit Task Statuses" }));

    // Remove one value so we can verify the exact payload
    await userEvent.click(
      screen.getByRole("button", { name: "Remove Todo from Task Statuses" })
    );

    await userEvent.click(screen.getByRole("button", { name: "Save" }));

    expect(handleSave).toHaveBeenCalledTimes(1);
    expect(handleSave).toHaveBeenCalledWith(["In Progress", "Done"]);
  });

  it("Cancel button exits edit mode without calling onSave", async () => {
    const handleSave = vi.fn();
    render(<DictionaryEditor {...defaultProps} onSave={handleSave} />);

    await userEvent.click(screen.getByRole("button", { name: "Edit Task Statuses" }));
    await userEvent.click(screen.getByRole("button", { name: "Cancel" }));

    expect(handleSave).not.toHaveBeenCalled();
    // Back in view mode — Edit button is visible again
    expect(screen.getByRole("button", { name: "Edit Task Statuses" })).toBeInTheDocument();
  });
});
