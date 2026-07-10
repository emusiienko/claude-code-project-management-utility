/**
 * SettingsPage — unit tests
 *
 * Covers the STORY-016 restructure:
 * - /settings renders SystemSettings and no "Project Overrides" tab.
 * - Page heading and descriptive copy are present.
 * - The copy directs users to the project context for overrides.
 */

import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { describe, expect, it, vi } from "vitest";
import SettingsScreen from "./SettingsPage";

// ---------------------------------------------------------------------------
// Mock SystemSettings so we don't need a real query client
// ---------------------------------------------------------------------------

vi.mock("./components/SystemSettings", () => ({
  SystemSettings: () => (
    <section aria-label="System Settings">
      <div data-testid="system-settings-content">System Settings Content</div>
    </section>
  ),
}));

// ---------------------------------------------------------------------------
// Helper
// ---------------------------------------------------------------------------

function renderSettingsPage() {
  return render(
    <MemoryRouter>
      <SettingsScreen />
    </MemoryRouter>,
  );
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("SettingsPage (STORY-016 restructure)", () => {
  it("renders the page heading", () => {
    renderSettingsPage();
    expect(
      screen.getByRole("heading", { name: "Settings", level: 1 }),
    ).toBeInTheDocument();
  });

  it("renders the SystemSettings component", () => {
    renderSettingsPage();
    expect(screen.getByTestId("system-settings-content")).toBeInTheDocument();
  });

  it("does NOT render a Project Overrides tab", () => {
    renderSettingsPage();
    expect(
      screen.queryByRole("tab", { name: /project overrides/i }),
    ).not.toBeInTheDocument();
    expect(
      screen.queryByText(/project overrides/i),
    ).not.toBeInTheDocument();
  });

  it("does NOT render a System Defaults tab (flat page, no tab switcher)", () => {
    renderSettingsPage();
    expect(
      screen.queryByRole("tab", { name: /system defaults/i }),
    ).not.toBeInTheDocument();
  });

  it("shows copy directing users to the project context for overrides", () => {
    renderSettingsPage();
    // The copy mentions going to the project to manage overrides
    expect(screen.getByText(/project/i)).toBeInTheDocument();
  });
});
