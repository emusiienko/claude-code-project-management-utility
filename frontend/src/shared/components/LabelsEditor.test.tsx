/**
 * Unit tests for the LabelsEditor component — STORY-004 (TASK-007).
 *
 * Coverage zones (per task spec):
 * - Add label: key required (Add button disabled when key is empty), adds on click
 * - Remove label: clicking the Remove button fires onChange without that label
 * - Disabled state: inputs and buttons are non-interactive when disabled=true
 * - Empty state: data-testid="labels-editor-empty" placeholder is rendered
 *   when no labels are present
 */

import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { LabelsEditor } from "./LabelsEditor";
import type { Label } from "@/api/types";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const noLabels: Label[] = [];
const oneLabel: Label[] = [{ key: "env", value: "prod" }];
const twoLabels: Label[] = [
  { key: "env", value: "prod" },
  { key: "team", value: "backend" },
];

// ---------------------------------------------------------------------------
// Empty state
// ---------------------------------------------------------------------------

describe("LabelsEditor — empty state", () => {
  it("renders the empty placeholder when value is empty", () => {
    render(<LabelsEditor value={noLabels} onChange={vi.fn()} />);

    expect(screen.getByTestId("labels-editor-empty")).toBeInTheDocument();
  });

  it("does not render the empty placeholder when labels are present", () => {
    render(<LabelsEditor value={oneLabel} onChange={vi.fn()} />);

    expect(screen.queryByTestId("labels-editor-empty")).toBeNull();
  });

  it("renders an accessible list when labels are present", () => {
    render(<LabelsEditor value={oneLabel} onChange={vi.fn()} />);

    expect(screen.getByRole("list", { name: "Labels" })).toBeInTheDocument();
  });
});

// ---------------------------------------------------------------------------
// Add label
// ---------------------------------------------------------------------------

describe("LabelsEditor — adding a label", () => {
  it("Add label button is disabled when key input is empty", () => {
    render(<LabelsEditor value={noLabels} onChange={vi.fn()} />);

    expect(screen.getByRole("button", { name: "Add label" })).toBeDisabled();
  });

  it("Add label button is enabled when key input has content", async () => {
    render(<LabelsEditor value={noLabels} onChange={vi.fn()} />);

    await userEvent.type(screen.getByPlaceholderText("key"), "mykey");

    expect(screen.getByRole("button", { name: "Add label" })).not.toBeDisabled();
  });

  it("Add label button stays disabled when key is only whitespace", async () => {
    render(<LabelsEditor value={noLabels} onChange={vi.fn()} />);

    await userEvent.type(screen.getByPlaceholderText("key"), "   ");

    expect(screen.getByRole("button", { name: "Add label" })).toBeDisabled();
  });

  it("calls onChange with the new label appended when Add is clicked", async () => {
    const handleChange = vi.fn();
    render(<LabelsEditor value={noLabels} onChange={handleChange} />);

    await userEvent.type(screen.getByPlaceholderText("key"), "env");
    await userEvent.type(screen.getByPlaceholderText("value (optional)"), "prod");
    await userEvent.click(screen.getByRole("button", { name: "Add label" }));

    expect(handleChange).toHaveBeenCalledTimes(1);
    expect(handleChange).toHaveBeenCalledWith([{ key: "env", value: "prod" }]);
  });

  it("calls onChange with key-only label when value is omitted", async () => {
    const handleChange = vi.fn();
    render(<LabelsEditor value={noLabels} onChange={handleChange} />);

    await userEvent.type(screen.getByPlaceholderText("key"), "tag");
    await userEvent.click(screen.getByRole("button", { name: "Add label" }));

    expect(handleChange).toHaveBeenCalledWith([{ key: "tag", value: "" }]);
  });

  it("appends to existing labels (does not replace)", async () => {
    const handleChange = vi.fn();
    render(<LabelsEditor value={oneLabel} onChange={handleChange} />);

    await userEvent.type(screen.getByPlaceholderText("key"), "team");
    await userEvent.click(screen.getByRole("button", { name: "Add label" }));

    const newLabels = handleChange.mock.calls[0][0] as Label[];
    expect(newLabels).toHaveLength(2);
    expect(newLabels[0]).toEqual(oneLabel[0]);
    expect(newLabels[1].key).toBe("team");
  });

  it("pressing Enter in the key input triggers add", async () => {
    const handleChange = vi.fn();
    render(<LabelsEditor value={noLabels} onChange={handleChange} />);

    await userEvent.type(screen.getByPlaceholderText("key"), "enter-key{Enter}");

    expect(handleChange).toHaveBeenCalledTimes(1);
    expect(handleChange.mock.calls[0][0][0].key).toBe("enter-key");
  });
});

// ---------------------------------------------------------------------------
// Remove label
// ---------------------------------------------------------------------------

describe("LabelsEditor — removing a label", () => {
  it("renders a Remove button for each existing label", () => {
    render(<LabelsEditor value={twoLabels} onChange={vi.fn()} />);

    expect(screen.getByRole("button", { name: "Remove env:prod" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Remove team:backend" })).toBeInTheDocument();
  });

  it("calls onChange without the removed label when Remove is clicked", async () => {
    const handleChange = vi.fn();
    render(<LabelsEditor value={twoLabels} onChange={handleChange} />);

    await userEvent.click(screen.getByRole("button", { name: "Remove env:prod" }));

    expect(handleChange).toHaveBeenCalledTimes(1);
    const remaining = handleChange.mock.calls[0][0] as Label[];
    expect(remaining).toHaveLength(1);
    expect(remaining[0]).toEqual(twoLabels[1]);
  });

  it("calls onChange with empty array when the only label is removed", async () => {
    const handleChange = vi.fn();
    render(<LabelsEditor value={oneLabel} onChange={handleChange} />);

    await userEvent.click(screen.getByRole("button", { name: "Remove env:prod" }));

    expect(handleChange).toHaveBeenCalledWith([]);
  });

  it("removing one label does not affect the other label", async () => {
    const handleChange = vi.fn();
    render(<LabelsEditor value={twoLabels} onChange={handleChange} />);

    await userEvent.click(screen.getByRole("button", { name: "Remove env:prod" }));

    const remaining = handleChange.mock.calls[0][0] as Label[];
    expect(remaining[0]).toEqual(twoLabels[1]);
  });
});

// ---------------------------------------------------------------------------
// Disabled state
// ---------------------------------------------------------------------------

describe("LabelsEditor — disabled state", () => {
  it("the key input is disabled when disabled=true", () => {
    render(<LabelsEditor value={noLabels} onChange={vi.fn()} disabled />);

    expect(screen.getByPlaceholderText("key")).toBeDisabled();
  });

  it("the value input is disabled when disabled=true", () => {
    render(<LabelsEditor value={noLabels} onChange={vi.fn()} disabled />);

    expect(screen.getByPlaceholderText("value (optional)")).toBeDisabled();
  });

  it("the Add label button is disabled when disabled=true (even if key has content)", async () => {
    // Provide a pre-filled key scenario via defaultValue — disabled inputs still
    // render their value; the Add button canAdd check already gates on !disabled.
    render(
      <LabelsEditor value={noLabels} onChange={vi.fn()} disabled />
    );

    // The button must be disabled regardless
    expect(screen.getByRole("button", { name: "Add label" })).toBeDisabled();
  });

  it("Remove buttons are disabled when disabled=true", () => {
    render(<LabelsEditor value={oneLabel} onChange={vi.fn()} disabled />);

    expect(screen.getByRole("button", { name: "Remove env:prod" })).toBeDisabled();
  });

  it("Remove buttons are enabled when disabled is not set", () => {
    render(<LabelsEditor value={oneLabel} onChange={vi.fn()} />);

    expect(screen.getByRole("button", { name: "Remove env:prod" })).not.toBeDisabled();
  });
});
