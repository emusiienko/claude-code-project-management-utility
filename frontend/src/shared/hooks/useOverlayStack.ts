/**
 * useOverlayStack — state + controls for the global slide-over overlay that
 * hosts Projects and Config (STORY-022 Revision 3).
 *
 * The overlay shows at most one stack at a time: none, the Projects stack
 * (project list → a single project's Settings), or the Config stack (one
 * level, the system dictionary editor). Opening, pushing, or closing the
 * overlay never touches the router — the main view underneath stays mounted
 * and its URL unchanged throughout, which is the whole point of the overlay
 * model (see implementation_plan.md Revision 3).
 *
 * Must be instantiated once, above both the top bar (which renders the
 * triggers) and the overlay host (which renders the panel) — see RootLayout.
 */

import { useCallback, useState } from "react";

/** A single level of the Projects overlay stack. */
export type ProjectsOverlayLevel =
  | { screen: "list" }
  | { screen: "settings"; projectId: string };

/** The overlay's current stack — at most one of Projects/Config is open. */
export type OverlayState =
  | { kind: "none" }
  | { kind: "projects"; stack: ProjectsOverlayLevel[] }
  | { kind: "config" };

export interface OverlayControls {
  state: OverlayState;
  /** Opens the Projects overlay at its root level (the project list). */
  openProjects: () => void;
  /** Opens the Config overlay (a single level, no Back control). */
  openConfig: () => void;
  /**
   * Pushes a project's Settings as the second Projects level. A no-op unless
   * the Projects overlay is already open — callers only expose this action
   * from within the project list.
   */
  openProjectSettings: (projectId: string) => void;
  /** Pops one level of the current stack. A no-op at the root. */
  back: () => void;
  /** Clears the whole stack in one action, closing the overlay entirely. */
  dismiss: () => void;
}

/** True when the current stack has depth beyond its root — i.e. Back should render. */
export function hasOverlayDepth(state: OverlayState): boolean {
  return state.kind === "projects" && state.stack.length > 1;
}

/**
 * Owns the overlay stack state and exposes the actions that mutate it.
 * @returns The current state plus the open/push/back/dismiss controls.
 */
export function useOverlayStack(): OverlayControls {
  const [state, setState] = useState<OverlayState>({ kind: "none" });

  const openProjects = useCallback(() => {
    setState({ kind: "projects", stack: [{ screen: "list" }] });
  }, []);

  const openConfig = useCallback(() => {
    setState({ kind: "config" });
  }, []);

  const openProjectSettings = useCallback((projectId: string) => {
    setState((prev) =>
      prev.kind === "projects"
        ? {
            kind: "projects",
            stack: [...prev.stack, { screen: "settings", projectId }],
          }
        : prev,
    );
  }, []);

  const back = useCallback(() => {
    setState((prev) =>
      prev.kind === "projects" && prev.stack.length > 1
        ? { kind: "projects", stack: prev.stack.slice(0, -1) }
        : prev,
    );
  }, []);

  const dismiss = useCallback(() => setState({ kind: "none" }), []);

  return { state, openProjects, openConfig, openProjectSettings, back, dismiss };
}
