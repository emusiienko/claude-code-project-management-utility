/**
 * OverlayHost — unit tests (STORY-022 Revision 3 / TASK-011)
 *
 * Panel bodies are mocked (ProjectsPanelBody, ProjectSettingsPanelBody,
 * SystemSettings) so this suite exercises only the overlay frame: which
 * body renders per stack level, the Back/Dismiss controls, and Escape
 * composition with the shared modal-escape stack — not their own internals
 * (covered by their own test files / TanStack Query mocks would otherwise be
 * required here).
 *
 * Covers:
 * - Renders nothing while the overlay stack is empty.
 * - Projects root level renders the project list body; Back is absent.
 * - Choosing a project (via the mocked list body) shows the Settings body;
 *   Back appears once there is depth beyond the root.
 * - Back returns from Settings to the list.
 * - Dismiss clears the whole stack from either level.
 * - The Config panel is a single level — Back never renders for it.
 * - Escape pops one level when the stack has depth, and dismisses at the root.
 * - Escape composes with an already-open modal registered on the shared
 *   useModalEscape stack: the overlay (mounted later) closes on the first
 *   press; a second press then closes the modal beneath it.
 */

import { render, screen, fireEvent } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { OverlayHost } from "./OverlayHost";
import { useModalEscape } from "@/shared/hooks/useModalEscape";
import type { OverlayControls, OverlayState } from "@/shared/hooks/useOverlayStack";

// ---------------------------------------------------------------------------
// Mocks — panel bodies are content-only; OverlayHost's own logic is what's tested
// ---------------------------------------------------------------------------

vi.mock("@/features/projects/components/ProjectsPanelBody", () => ({
  ProjectsPanelBody: ({ onSelectProject }: { onSelectProject: (id: string) => void }) => (
    <div>
      <span>Projects list body</span>
      <button type="button" onClick={() => onSelectProject("proj-1")}>
        Choose proj-1
      </button>
    </div>
  ),
}));

vi.mock("@/features/settings/components/ProjectSettingsPanelBody", () => ({
  ProjectSettingsPanelBody: ({ projectId }: { projectId: string; onDismissOverlay: () => void }) => (
    <div>Settings body for {projectId}</div>
  ),
}));

vi.mock("@/features/settings/components/SystemSettings", () => ({
  SystemSettings: () => <div>Config body</div>,
}));

// ---------------------------------------------------------------------------
// Helper
// ---------------------------------------------------------------------------

function makeOverlay(state: OverlayState): OverlayControls {
  return {
    state,
    openProjects: vi.fn(),
    openConfig: vi.fn(),
    openProjectSettings: vi.fn(),
    back: vi.fn(),
    dismiss: vi.fn(),
  };
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("OverlayHost", () => {
  it("renders nothing while the overlay stack is empty", () => {
    const overlay = makeOverlay({ kind: "none" });
    const { container } = render(<OverlayHost overlay={overlay} />);
    expect(container).toBeEmptyDOMElement();
  });

  it("renders the Projects list body at the root, with no Back control", () => {
    const overlay = makeOverlay({ kind: "projects", stack: [{ screen: "list" }] });
    render(<OverlayHost overlay={overlay} />);
    expect(screen.getByText("Projects list body")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Back to Projects list" })).not.toBeInTheDocument();
  });

  it("renders the Settings body and a Back control once a project has been pushed", () => {
    const overlay = makeOverlay({
      kind: "projects",
      stack: [{ screen: "list" }, { screen: "settings", projectId: "proj-1" }],
    });
    render(<OverlayHost overlay={overlay} />);
    expect(screen.getByText("Settings body for proj-1")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Back to Projects list" })).toBeInTheDocument();
  });

  it("clicking Back calls overlay.back()", () => {
    const overlay = makeOverlay({
      kind: "projects",
      stack: [{ screen: "list" }, { screen: "settings", projectId: "proj-1" }],
    });
    render(<OverlayHost overlay={overlay} />);
    fireEvent.click(screen.getByRole("button", { name: "Back to Projects list" }));
    expect(overlay.back).toHaveBeenCalledTimes(1);
  });

  it("clicking Dismiss calls overlay.dismiss() from the Projects root", () => {
    const overlay = makeOverlay({ kind: "projects", stack: [{ screen: "list" }] });
    render(<OverlayHost overlay={overlay} />);
    fireEvent.click(screen.getByRole("button", { name: "Dismiss Projects panel" }));
    expect(overlay.dismiss).toHaveBeenCalledTimes(1);
  });

  it("clicking Dismiss calls overlay.dismiss() from the Settings level too (clears the whole stack, not one level)", () => {
    const overlay = makeOverlay({
      kind: "projects",
      stack: [{ screen: "list" }, { screen: "settings", projectId: "proj-1" }],
    });
    render(<OverlayHost overlay={overlay} />);
    fireEvent.click(screen.getByRole("button", { name: "Dismiss Projects panel" }));
    expect(overlay.dismiss).toHaveBeenCalledTimes(1);
    expect(overlay.back).not.toHaveBeenCalled();
  });

  it("clicking the backdrop dismisses the whole stack", () => {
    const overlay = makeOverlay({ kind: "projects", stack: [{ screen: "list" }] });
    const { container } = render(<OverlayHost overlay={overlay} />);
    const backdrop = container.querySelector('[aria-hidden="true"]');
    expect(backdrop).not.toBeNull();
    fireEvent.click(backdrop as Element);
    expect(overlay.dismiss).toHaveBeenCalledTimes(1);
  });

  it("renders the Config body as a single level, with no Back control", () => {
    const overlay = makeOverlay({ kind: "config" });
    render(<OverlayHost overlay={overlay} />);
    expect(screen.getByText("Config body")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Back to Projects list" })).not.toBeInTheDocument();
  });

  it("clicking Dismiss on the Config panel clears it", () => {
    const overlay = makeOverlay({ kind: "config" });
    render(<OverlayHost overlay={overlay} />);
    fireEvent.click(screen.getByRole("button", { name: "Dismiss Config panel" }));
    expect(overlay.dismiss).toHaveBeenCalledTimes(1);
  });

  // -------------------------------------------------------------------------
  // Escape behavior
  // -------------------------------------------------------------------------

  it("Escape calls back() when the Projects stack has depth beyond the root", () => {
    const overlay = makeOverlay({
      kind: "projects",
      stack: [{ screen: "list" }, { screen: "settings", projectId: "proj-1" }],
    });
    render(<OverlayHost overlay={overlay} />);
    fireEvent.keyDown(document, { key: "Escape" });
    expect(overlay.back).toHaveBeenCalledTimes(1);
    expect(overlay.dismiss).not.toHaveBeenCalled();
  });

  it("Escape calls dismiss() at the Projects root (no depth)", () => {
    const overlay = makeOverlay({ kind: "projects", stack: [{ screen: "list" }] });
    render(<OverlayHost overlay={overlay} />);
    fireEvent.keyDown(document, { key: "Escape" });
    expect(overlay.dismiss).toHaveBeenCalledTimes(1);
    expect(overlay.back).not.toHaveBeenCalled();
  });

  it("Escape calls dismiss() on the single-level Config panel", () => {
    const overlay = makeOverlay({ kind: "config" });
    render(<OverlayHost overlay={overlay} />);
    fireEvent.keyDown(document, { key: "Escape" });
    expect(overlay.dismiss).toHaveBeenCalledTimes(1);
  });

  it("composes with an already-open modal beneath it: the overlay (mounted after, topmost) closes on the first Escape, and the modal beneath it only sees the next Escape once the overlay unregisters", () => {
    /** Stand-in for a Story slide-over / Task Detail modal already open in the main view. */
    function FakeUnderlyingModal({ onClose }: { onClose: () => void }) {
      useModalEscape(onClose);
      return <div>Fake underlying modal</div>;
    }

    const underlyingOnClose = vi.fn();
    render(<FakeUnderlyingModal onClose={underlyingOnClose} />);

    const overlay = makeOverlay({ kind: "config" });
    const { unmount } = render(<OverlayHost overlay={overlay} />);

    // First Escape: the overlay is topmost (registered later) — it closes,
    // not the modal beneath it.
    fireEvent.keyDown(document, { key: "Escape" });
    expect(overlay.dismiss).toHaveBeenCalledTimes(1);
    expect(underlyingOnClose).not.toHaveBeenCalled();

    // Simulate the overlay actually closing (state -> "none", which unmounts
    // OverlayHost's registration in the real app) — the next Escape now
    // reaches the modal that was underneath it.
    unmount();
    fireEvent.keyDown(document, { key: "Escape" });
    expect(underlyingOnClose).toHaveBeenCalledTimes(1);
  });
});
