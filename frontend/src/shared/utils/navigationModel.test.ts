/**
 * navigationModel — unit tests
 *
 * Covers:
 * - isClosableViewPath: /projects, /settings, and the standalone Project
 *   Settings sub-page are closable; everything else is not.
 * - isMainViewPath: exact negation of isClosableViewPath.
 * - deriveAppMode: /sessions* → "sessions", everything else → "task-manager".
 */

import { describe, expect, it } from "vitest";
import { deriveAppMode, isClosableViewPath, isMainViewPath } from "./navigationModel";

describe("isClosableViewPath", () => {
  it("classifies /projects as closable", () => {
    expect(isClosableViewPath("/projects")).toBe(true);
  });

  it("classifies /settings as closable", () => {
    expect(isClosableViewPath("/settings")).toBe(true);
  });

  it("classifies the standalone Project Settings sub-page as closable", () => {
    expect(isClosableViewPath("/projects/proj-1/settings")).toBe(true);
  });

  it("does not classify /projects/:id/stories as closable", () => {
    expect(isClosableViewPath("/projects/proj-1/stories")).toBe(false);
  });

  it("does not classify /projects/:id/board as closable", () => {
    expect(isClosableViewPath("/projects/proj-1/board")).toBe(false);
  });

  it("does not classify /sessions as closable", () => {
    expect(isClosableViewPath("/sessions")).toBe(false);
  });

  it("does not classify / as closable", () => {
    expect(isClosableViewPath("/")).toBe(false);
  });

  it("does not classify a path with extra segments past the Project Settings sub-page", () => {
    expect(isClosableViewPath("/projects/proj-1/settings/extra")).toBe(false);
  });
});

describe("isMainViewPath", () => {
  it("is the exact negation of isClosableViewPath for a closable route", () => {
    expect(isMainViewPath("/projects")).toBe(false);
    expect(isMainViewPath("/settings")).toBe(false);
  });

  it("is true for Task Manager routes", () => {
    expect(isMainViewPath("/projects/proj-1/stories")).toBe(true);
  });

  it("is true for Sessions", () => {
    expect(isMainViewPath("/sessions")).toBe(true);
  });
});

describe("deriveAppMode", () => {
  it("derives 'sessions' for /sessions", () => {
    expect(deriveAppMode("/sessions")).toBe("sessions");
  });

  it("derives 'sessions' for a nested /sessions path", () => {
    expect(deriveAppMode("/sessions/123")).toBe("sessions");
  });

  it("derives 'task-manager' for a project route", () => {
    expect(deriveAppMode("/projects/proj-1/board")).toBe("task-manager");
  });

  it("derives 'task-manager' for the root path", () => {
    expect(deriveAppMode("/")).toBe("task-manager");
  });
});
