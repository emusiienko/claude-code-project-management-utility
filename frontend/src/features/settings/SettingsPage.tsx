/**
 * Settings screen — entry point for the /settings route.
 *
 * Shows the system-level dictionary defaults only. Project dictionary
 * overrides have moved to /projects/:id/settings (the Settings sub-nav tab
 * inside the project context), rendered by ProjectSettingsPage.
 */

import { useNavigate } from "react-router-dom";
import { ArrowLeft } from "lucide-react";
import { SystemSettings } from "./components/SystemSettings";

/**
 * Root Settings screen — system-level dictionary defaults.
 */
export default function SettingsScreen() {
  const navigate = useNavigate();

  return (
    <div className="mx-auto w-full max-w-5xl px-6 py-8">
      {/* Back navigation */}
      <button
        type="button"
        onClick={() => navigate(-1)}
        className="mb-6 flex items-center gap-1.5 text-sm text-text-secondary transition-colors hover:text-text focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500 focus-visible:ring-offset-2"
        aria-label="Go back to previous page"
      >
        <ArrowLeft size={16} aria-hidden="true" />
        Back
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
