/**
 * SessionsShell — component tests (STORY-006 TASK-010)
 *
 * Mirrors AppShell.test.tsx's structure, adjusted for Sessions-mode naming
 * and its own localStorage/storage keys. The cross-shell independence
 * assertion ("resizing one leaves the other's width unchanged") lives once,
 * in AppShell.test.tsx, to avoid duplicating the same check in both files.
 *
 * jsdom implements no `ResizeObserver`, no `setPointerCapture` /
 * `releasePointerCapture`, and performs no layout (`clientWidth` and
 * `getBoundingClientRect()` both read as 0) — all are stubbed globally on
 * `HTMLElement.prototype` for each test and restored in `afterEach`, per
 * Coding Conventions § Testing > Mocking boundary and the jsdom-stub
 * precedent set in TASK-008/TASK-009's own tests.
 */

import { render, screen, fireEvent } from "@testing-library/react";
import { MemoryRouter, Routes, Route } from "react-router-dom";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";
import { SessionsShell } from "./SessionsShell";
import { AppShell } from "./AppShell";
import { __resetPanelWidths } from "@/shared/hooks/useResizablePanel";

// ---------------------------------------------------------------------------
// Mocks
// ---------------------------------------------------------------------------

vi.mock("@/shared/hooks/useProjectList", () => ({
  useProjectList: vi.fn(),
}));

import { useProjectList } from "@/shared/hooks/useProjectList";
const mockUseProjectList = vi.mocked(useProjectList);

const PROJECTS = [
  {
    id: "proj-001",
    name: "Alpha",
    description: null,
    created_at: "2026-01-01T00:00:00Z",
    updated_at: "2026-01-01T00:00:00Z",
  },
];

// ---------------------------------------------------------------------------
// jsdom layout/ResizeObserver/pointer-capture stubs
// ---------------------------------------------------------------------------

/** Large enough that both the sidebar's max (480) and the outlet's min (560) fit. */
const CONTAINER_WIDTH = 1200;

class FakeResizeObserver {
  observe() {}
  unobserve() {}
  disconnect() {}
}

function stubLayout() {
  Object.defineProperty(HTMLElement.prototype, "clientWidth", {
    configurable: true,
    value: CONTAINER_WIDTH,
  });
  HTMLElement.prototype.getBoundingClientRect = function () {
    return {
      left: 0,
      right: CONTAINER_WIDTH,
      top: 0,
      bottom: 0,
      width: CONTAINER_WIDTH,
      height: 0,
      x: 0,
      y: 0,
      toJSON() {},
    } as DOMRect;
  };
  vi.stubGlobal("ResizeObserver", FakeResizeObserver);
  HTMLElement.prototype.setPointerCapture = vi.fn();
  HTMLElement.prototype.releasePointerCapture = vi.fn();
}

function restoreLayout() {
  // @ts-expect-error — restore jsdom's real (0-valued) getter
  delete HTMLElement.prototype.clientWidth;
  // @ts-expect-error — restore jsdom's real (all-zero) implementation
  delete HTMLElement.prototype.getBoundingClientRect;
  vi.unstubAllGlobals();
  // @ts-expect-error — jsdom implements neither method at all
  delete HTMLElement.prototype.setPointerCapture;
  // @ts-expect-error — jsdom implements neither method at all
  delete HTMLElement.prototype.releasePointerCapture;
  document.body.style.userSelect = "";
  document.body.style.cursor = "";
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function renderSessionsShell(initialPath = "/sessions/proj-001") {
  return render(
    <MemoryRouter initialEntries={[initialPath]}>
      <Routes>
        <Route path="/sessions/:projectId" element={<SessionsShell />}>
          <Route index element={<div data-testid="outlet-content" />} />
        </Route>
      </Routes>
    </MemoryRouter>,
  );
}

function renderAppShell(initialPath = "/projects/proj-001/stories") {
  return render(
    <MemoryRouter initialEntries={[initialPath]}>
      <Routes>
        <Route path="/projects/:projectId/*" element={<AppShell />}>
          <Route path="*" element={<div data-testid="outlet-content" />} />
        </Route>
      </Routes>
    </MemoryRouter>,
  );
}

const SIDEBAR_COLLAPSED_KEY = "app:sessions_sidebar_collapsed";
const SIDEBAR_ROLE_NAME = "Sessions project sidebar";
const SEPARATOR_NAME = "Resize sessions project sidebar";

function getSidebar() {
  return screen.getByRole("complementary", { name: SIDEBAR_ROLE_NAME });
}

beforeEach(() => {
  localStorage.clear();
  __resetPanelWidths();
  mockUseProjectList.mockReturnValue({ data: PROJECTS } as never);
  stubLayout();
});

afterEach(() => {
  localStorage.clear();
  __resetPanelWidths();
  vi.clearAllMocks();
  restoreLayout();
});

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("SessionsShell", () => {
  it("renders a separator between the sidebar and the outlet while expanded", () => {
    renderSessionsShell();
    expect(getSidebar()).toBeInTheDocument();
    expect(
      screen.getByRole("separator", { name: SEPARATOR_NAME }),
    ).toBeInTheDocument();
    expect(screen.getByTestId("outlet-content")).toBeInTheDocument();
  });

  it("renders no separator while the sidebar is collapsed", () => {
    localStorage.setItem(SIDEBAR_COLLAPSED_KEY, JSON.stringify(true));
    renderSessionsShell();
    expect(
      screen.queryByRole("separator", { name: SEPARATOR_NAME }),
    ).not.toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "Expand sidebar" }),
    ).toBeInTheDocument();
  });

  it("hides the separator and persists collapse to localStorage when the toggle is clicked", () => {
    renderSessionsShell();
    fireEvent.click(screen.getByRole("button", { name: "Collapse sidebar" }));

    expect(
      screen.queryByRole("separator", { name: SEPARATOR_NAME }),
    ).not.toBeInTheDocument();
    expect(
      JSON.parse(localStorage.getItem(SIDEBAR_COLLAPSED_KEY) ?? "false"),
    ).toBe(true);
  });

  it("restores the separator when re-expanded from a collapsed start", () => {
    localStorage.setItem(SIDEBAR_COLLAPSED_KEY, JSON.stringify(true));
    renderSessionsShell();
    fireEvent.click(screen.getByRole("button", { name: "Expand sidebar" }));

    expect(
      screen.getByRole("separator", { name: SEPARATOR_NAME }),
    ).toBeInTheDocument();
  });

  it("the collapse toggle precedes the separator in DOM order, keeping it first in tab order", () => {
    renderSessionsShell();
    const toggle = screen.getByRole("button", { name: "Collapse sidebar" });
    const separator = screen.getByRole("separator", { name: SEPARATOR_NAME });

    // eslint-disable-next-line no-bitwise
    expect(
      toggle.compareDocumentPosition(separator) &
        Node.DOCUMENT_POSITION_FOLLOWING,
    ).toBeTruthy();
  });

  it("an ArrowRight keyboard nudge grows the sidebar's rendered width", async () => {
    const user = userEvent.setup();
    renderSessionsShell();
    const separator = screen.getByRole("separator", { name: SEPARATOR_NAME });
    separator.focus();

    await user.keyboard("{ArrowRight}");

    expect(getSidebar()).toHaveStyle({ width: "256px" }); // 240 + NUDGE_STEP_PX(16)
  });

  it("Home moves the sidebar to its minimum width", async () => {
    const user = userEvent.setup();
    renderSessionsShell();
    const separator = screen.getByRole("separator", { name: SEPARATOR_NAME });
    separator.focus();

    await user.keyboard("{Home}");

    expect(getSidebar()).toHaveStyle({ width: "180px" });
  });

  it("End moves the sidebar to its effective maximum width", async () => {
    const user = userEvent.setup();
    renderSessionsShell();
    const separator = screen.getByRole("separator", { name: SEPARATOR_NAME });
    separator.focus();

    await user.keyboard("{End}");

    expect(getSidebar()).toHaveStyle({ width: "480px" });
  });

  it("a pointer drag changes the sidebar's rendered width to the drop position", async () => {
    const user = userEvent.setup();
    renderSessionsShell();
    const separator = screen.getByRole("separator", { name: SEPARATOR_NAME });

    await user.pointer([
      {
        target: separator,
        keys: "[MouseLeft>]",
        coords: { clientX: 50, clientY: 0 },
      },
      { target: separator, coords: { clientX: 300, clientY: 0 } },
      { target: separator, keys: "[/MouseLeft]" },
    ]);

    expect(getSidebar()).toHaveStyle({ width: "300px" });
  });

  it("clamps a drag past the lower or upper bound to that bound", async () => {
    const user = userEvent.setup();
    renderSessionsShell();
    const separator = screen.getByRole("separator", { name: SEPARATOR_NAME });

    await user.pointer([
      {
        target: separator,
        keys: "[MouseLeft>]",
        coords: { clientX: 50, clientY: 0 },
      },
      { target: separator, coords: { clientX: 5, clientY: 0 } },
      { target: separator, keys: "[/MouseLeft]" },
    ]);
    expect(getSidebar()).toHaveStyle({ width: "180px" });

    await user.pointer([
      {
        target: separator,
        keys: "[MouseLeft>]",
        coords: { clientX: 200, clientY: 0 },
      },
      { target: separator, coords: { clientX: 5000, clientY: 0 } },
      { target: separator, keys: "[/MouseLeft]" },
    ]);
    expect(getSidebar()).toHaveStyle({ width: "480px" });
  });

  it("restores the resized width, not the default, after a collapse and re-expand", async () => {
    const user = userEvent.setup();
    renderSessionsShell();
    const separator = screen.getByRole("separator", { name: SEPARATOR_NAME });
    separator.focus();
    await user.keyboard("{End}"); // -> 480px

    fireEvent.click(screen.getByRole("button", { name: "Collapse sidebar" }));
    fireEvent.click(screen.getByRole("button", { name: "Expand sidebar" }));

    expect(getSidebar()).toHaveStyle({ width: "480px" });
  });

  it("survives an unmount and remount (navigating away and back) without a reload", async () => {
    const user = userEvent.setup();
    const { unmount } = renderSessionsShell();
    const separator = screen.getByRole("separator", { name: SEPARATOR_NAME });
    separator.focus();
    await user.keyboard("{Home}"); // -> 180px
    unmount();

    renderSessionsShell();

    expect(getSidebar()).toHaveStyle({ width: "180px" });
  });

  it("returns to the default 240px once the module-level width map is cleared (simulated reload)", async () => {
    const user = userEvent.setup();
    const { unmount } = renderSessionsShell();
    const separator = screen.getByRole("separator", { name: SEPARATOR_NAME });
    separator.focus();
    await user.keyboard("{Home}"); // -> 180px
    unmount();

    __resetPanelWidths(); // a real page reload starts from an empty module map
    renderSessionsShell();

    expect(getSidebar()).toHaveStyle({ width: "240px" });
  });

  it("resizing this shell's sidebar leaves AppShell's own sidebar width unchanged (reverse direction of AppShell.test.tsx's own check)", async () => {
    const user = userEvent.setup();
    const { unmount } = renderSessionsShell();
    const separator = screen.getByRole("separator", { name: SEPARATOR_NAME });
    separator.focus();
    await user.keyboard("{Home}"); // -> 180px
    unmount();

    renderAppShell();

    expect(
      screen.getByRole("complementary", { name: "Project sidebar" }),
    ).toHaveStyle({ width: "240px" });
  });
});
