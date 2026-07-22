/**
 * OverlayHost — state-driven slide-over overlay for Projects and Config
 * (STORY-022 Revision 3).
 *
 * Always mounted in RootLayout, layered over the main-view outlet. Renders
 * nothing while the overlay stack is empty. Reuses the Story slide-over's
 * panel chrome — right-side panel, dimmed backdrop starting below the top
 * bar so the top bar stays clickable and unclipped, the slide-in animation,
 * and z-indexing below the top bar (see StorySlideOver) — and registers with
 * the shared `useModalEscape` stack so Escape composes correctly with any
 * Story slide-over / Task Detail modal open in the main view underneath.
 *
 * Back pops one internal level of the current stack and is rendered only
 * once the stack has depth beyond its root (the Projects stack is two levels
 * deep: project list → a project's Settings; the Config stack is one level).
 * Dismiss clears the whole stack in one action. Escape behaves like Back
 * when the stack has depth, and like Dismiss at the root, closing exactly
 * one level per press.
 */

import { ChevronLeft, X } from "lucide-react";
import { hasOverlayDepth, type OverlayControls } from "@/shared/hooks/useOverlayStack";
import { useModalEscape } from "@/shared/hooks/useModalEscape";
import { ProjectsPanelBody } from "@/features/projects/components/ProjectsPanelBody";
import { ProjectSettingsPanelBody } from "@/features/settings/components/ProjectSettingsPanelBody";
import { SystemSettings } from "@/features/settings/components/SystemSettings";

interface OverlayHostProps {
  overlay: OverlayControls;
}

/** Static panel label per overlay kind — the header title stays stable across internal stack depth. */
function panelLabel(kind: OverlayControls["state"]["kind"]): string {
  return kind === "config" ? "Config" : kind === "projects" ? "Projects" : "";
}

export function OverlayHost({ overlay }: OverlayHostProps) {
  const { state, back, dismiss, openProjectSettings } = overlay;
  const isOpen = state.kind !== "none";
  const showBack = hasOverlayDepth(state);
  const label = panelLabel(state.kind);

  // Escape pops one level when the stack has depth, otherwise closes the
  // overlay entirely — "one level per press" (STORY-022 TASK-009).
  useModalEscape(() => (showBack ? back() : dismiss()), isOpen);

  if (!isOpen) return null;

  const currentProjectsLevel = state.kind === "projects" ? state.stack[state.stack.length - 1] : null;

  return (
    <>
      {/* Dimmed backdrop — click to dismiss the whole stack */}
      <div
        className="fixed inset-x-0 bottom-0 top-12 z-40 bg-black/40"
        aria-hidden="true"
        onClick={dismiss}
      />

      {/* Slide-over panel */}
      <div
        role="dialog"
        aria-modal="true"
        aria-label={label}
        className="fixed bottom-0 right-0 top-12 z-50 flex w-[70vw] flex-col bg-surface shadow-2xl animate-slide-in-from-right"
      >
        <header className="flex shrink-0 items-center gap-3 border-b border-border bg-surface px-4 py-3">
          {showBack && (
            <button
              type="button"
              onClick={back}
              className="flex items-center gap-1 rounded text-sm text-text-secondary hover:text-text focus:outline-none focus:ring-2 focus:ring-brand-500/40"
              aria-label="Back to Projects list"
            >
              <ChevronLeft size={16} aria-hidden="true" />
              <span>Back</span>
            </button>
          )}

          <h2 className="flex-1 truncate text-base font-semibold text-text">{label}</h2>

          <button
            type="button"
            onClick={dismiss}
            className="shrink-0 rounded p-1.5 text-text-secondary hover:bg-surface-muted hover:text-text focus:outline-none focus:ring-2 focus:ring-brand-500/40"
            aria-label={`Dismiss ${label} panel`}
            title={`Dismiss ${label} panel`}
          >
            <X size={18} aria-hidden="true" />
          </button>
        </header>

        <div className="min-h-0 flex-1 overflow-y-auto p-6">
          {currentProjectsLevel && currentProjectsLevel.screen === "list" && (
            <ProjectsPanelBody onSelectProject={openProjectSettings} />
          )}

          {currentProjectsLevel && currentProjectsLevel.screen === "settings" && (
            <ProjectSettingsPanelBody
              projectId={currentProjectsLevel.projectId}
              onDismissOverlay={dismiss}
            />
          )}

          {state.kind === "config" && <SystemSettings />}
        </div>
      </div>
    </>
  );
}
