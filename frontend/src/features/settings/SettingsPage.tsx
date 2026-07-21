/**
 * Settings screen — entry point for the /settings route.
 *
 * Shows the system-level dictionary defaults only. Project dictionary
 * overrides have moved to /projects/:id/settings (the standalone Project
 * Settings screen), rendered by ProjectSettingsPage.
 *
 * Carries a "Close" control that returns to the last recorded main view
 * (Task Manager or Sessions) rather than stepping through browser history
 * (STORY-022 TASK-007, superseding the earlier `navigate(-1)` Back button).
 */

import { useNavigate } from "react-router-dom";
import { ArrowLeft } from "lucide-react";
import { SystemSettings } from "./components/SystemSettings";
import { useLastMainViewUrl } from "@/shared/hooks/useLastMainViewUrl";

/**
 * Root Settings screen — system-level dictionary defaults.
 */
export default function SettingsScreen() {
  const navigate = useNavigate();
  const lastMainViewUrl = useLastMainViewUrl();

  // Falls back to "/" on a cold load with no recorded main view; the root
  // redirect resolves that to a Task Manager destination.
  function closeToLastMainView() {
    navigate(lastMainViewUrl ?? "/");
  }

  return (
    <div className="mx-auto w-full max-w-5xl px-6 py-8">
      {/* Close — returns to the last recorded main view (Task Manager or
          Sessions) instead of stepping through browser history */}
      <button
        type="button"
        onClick={closeToLastMainView}
        className="mb-6 flex items-center gap-1.5 text-sm text-text-secondary transition-colors hover:text-text focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500 focus-visible:ring-offset-2"
        aria-label="Close and return to the last view"
      >
        <ArrowLeft size={16} aria-hidden="true" />
        Close
      </button>

      {/* Page heading */}
      <h1 className="mb-1 text-2xl font-semibold text-text">Settings</h1>
      <p className="mb-6 text-sm text-text-secondary">
        Configure the system-wide allowed vocabulary values (dictionary keys)
        used across stories, tasks, attachments, and sessions. To override
        values for a specific project, open the project and go to its Settings
        tab.
      </p>

      <SystemSettings />
    </div>
  );
}
