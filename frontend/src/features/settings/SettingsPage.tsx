/**
 * Settings screen — entry point for the /settings route.
 *
 * Hosts two tabs:
 *   - "System" — view and edit the six global dictionary defaults
 *   - "Project" — view effective settings per project, set overrides,
 *                 and clear overrides back to the system default
 *
 * Tab state is local UI state (useState) — it does not persist across
 * navigation. No TanStack Query state lives here; it's delegated to
 * SystemSettings and ProjectSettings components.
 */

import { useState } from "react";
import { SystemSettings } from "./components/SystemSettings";
import { ProjectSettings } from "./components/ProjectSettings";

type Tab = "system" | "project";

interface TabItem {
  id: Tab;
  label: string;
}

const TABS: TabItem[] = [
  { id: "system", label: "System Defaults" },
  { id: "project", label: "Project Overrides" },
];

/**
 * Root Settings screen — tab switcher between System and Project settings panels.
 */
export default function SettingsScreen() {
  const [activeTab, setActiveTab] = useState<Tab>("system");

  return (
    <div>
      {/* Page heading */}
      <h1 className="mb-1 text-2xl font-semibold text-text">Settings</h1>
      <p className="mb-6 text-sm text-text-secondary">
        Configure the allowed vocabulary values (dictionary keys) used across
        stories, tasks, attachments, and sessions.
      </p>

      {/* Tab bar */}
      <div
        role="tablist"
        aria-label="Settings sections"
        className="mb-6 flex gap-1 border-b border-border"
      >
        {TABS.map((tab) => (
          <button
            key={tab.id}
            role="tab"
            id={`tab-${tab.id}`}
            aria-selected={activeTab === tab.id}
            aria-controls={`tabpanel-${tab.id}`}
            type="button"
            onClick={() => setActiveTab(tab.id)}
            className={[
              "-mb-px border-b-2 px-4 py-2 text-sm font-medium transition-colors",
              activeTab === tab.id
                ? "border-brand-600 text-brand-600"
                : "border-transparent text-text-secondary hover:text-text",
            ].join(" ")}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Tab panels */}
      <div
        role="tabpanel"
        id="tabpanel-system"
        aria-labelledby="tab-system"
        hidden={activeTab !== "system"}
      >
        {activeTab === "system" && <SystemSettings />}
      </div>

      <div
        role="tabpanel"
        id="tabpanel-project"
        aria-labelledby="tab-project"
        hidden={activeTab !== "project"}
      >
        {activeTab === "project" && <ProjectSettings />}
      </div>
    </div>
  );
}
