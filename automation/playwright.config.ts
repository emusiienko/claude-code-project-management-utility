import { defineConfig } from "@playwright/test";
import * as dotenv from "dotenv";

dotenv.config();

// This suite always targets the dev checkout's backend/MCP port (see CLAUDE.md > Infrastructure —
// qa-automation is an implementor-adjacent agent, confined to the dev stack; there is no prod-target
// exception here the way manual-qa has one). Override only via API_BASE_URL for local experimentation.
const API_BASE_URL = process.env.API_BASE_URL ?? "http://localhost:8100";

export default defineConfig({
  testDir: "./tests",
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: 0,
  workers: process.env.CI ? 2 : undefined,
  reporter: [["list"], ["html", { open: "never" }]],
  use: {
    baseURL: API_BASE_URL,
    extraHTTPHeaders: {
      Accept: "application/json",
    },
  },
});
