/**
 * Unit tests for the linkLabels shared utility — STORY-018 + STORY-019 + STORY-020.
 *
 * Coverage:
 * - getLinkLabel: known link types return direction-aware labels from the entries array;
 *   unknown types fall back to the raw value; undefined direction falls back.
 * - getLinkOptions: each entry produces two options (outbound + inbound) using the
 *   entry's outbound/inbound display labels; empty input returns empty array.
 */

import { describe, it, expect } from "vitest";
import { getLinkLabel, getLinkOptions } from "./linkLabels";
import type { LinkOption } from "./linkLabels";
import type { LinkTypeEntry } from "@/api/types";

// ---------------------------------------------------------------------------
// Shared test fixtures — canonical structured entries (from STORY-020 seed)
// ---------------------------------------------------------------------------

const CANONICAL_ENTRIES: LinkTypeEntry[] = [
  { value: "depends-on", outbound: "depends on", inbound: "dependent" },
  { value: "dependent", outbound: "dependent", inbound: "depends on" },
  { value: "created-by", outbound: "created by", inbound: "creates" },
  { value: "creates", outbound: "creates", inbound: "created by" },
  // context entry kept here only for backwards-compat tests; not in seed defaults
  { value: "context", outbound: "context", inbound: "context for" },
];

// ---------------------------------------------------------------------------
// getLinkLabel — STORY-018 + STORY-020
// ---------------------------------------------------------------------------

describe("getLinkLabel", () => {
  // Known types — outbound
  it('returns "depends on" for depends-on / outbound', () => {
    expect(getLinkLabel(CANONICAL_ENTRIES, "depends-on", "outbound")).toBe("depends on");
  });

  it('returns "created by" for created-by / outbound', () => {
    expect(getLinkLabel(CANONICAL_ENTRIES, "created-by", "outbound")).toBe("created by");
  });

  it('returns "context" for context / outbound', () => {
    expect(getLinkLabel(CANONICAL_ENTRIES, "context", "outbound")).toBe("context");
  });

  // Known types — inbound
  it('returns "dependent" for depends-on / inbound', () => {
    expect(getLinkLabel(CANONICAL_ENTRIES, "depends-on", "inbound")).toBe("dependent");
  });

  it('returns "creates" for created-by / inbound', () => {
    expect(getLinkLabel(CANONICAL_ENTRIES, "created-by", "inbound")).toBe("creates");
  });

  it('returns "context for" for context / inbound', () => {
    expect(getLinkLabel(CANONICAL_ENTRIES, "context", "inbound")).toBe("context for");
  });

  // Graceful degradation — unknown types (deleted after link was created)
  it("returns the raw value for an unknown link_type with outbound direction", () => {
    expect(getLinkLabel(CANONICAL_ENTRIES, "deleted-type", "outbound")).toBe("deleted-type");
  });

  it("returns the raw value for an unknown link_type with inbound direction", () => {
    expect(getLinkLabel(CANONICAL_ENTRIES, "deleted-type", "inbound")).toBe("deleted-type");
  });

  // Undefined direction
  it("returns the raw value when direction is undefined", () => {
    expect(getLinkLabel(CANONICAL_ENTRIES, "depends-on", undefined)).toBe("depends-on");
  });

  it("returns the raw value for unknown type and undefined direction", () => {
    expect(getLinkLabel(CANONICAL_ENTRIES, "mystery-link", undefined)).toBe("mystery-link");
  });

  // Empty entries array — graceful fallback
  it("returns the raw value when the entries array is empty", () => {
    expect(getLinkLabel([], "depends-on", "outbound")).toBe("depends-on");
  });
});

// ---------------------------------------------------------------------------
// getLinkOptions — STORY-019 + STORY-020
// ---------------------------------------------------------------------------

describe("getLinkOptions", () => {
  it("returns an empty array for an empty entries list", () => {
    expect(getLinkOptions([])).toEqual([]);
  });

  it("returns two entries per structured entry", () => {
    const options = getLinkOptions([{ value: "depends-on", outbound: "depends on", inbound: "dependent" }]);
    expect(options).toHaveLength(2);
  });

  it("first entry is outbound with the entry's outbound label", () => {
    const options = getLinkOptions([{ value: "depends-on", outbound: "depends on", inbound: "dependent" }]);
    expect(options[0].direction).toBe("outbound");
    expect(options[0].linkType).toBe("depends-on");
    expect(options[0].label).toBe("depends on");
  });

  it("second entry is inbound with the entry's inbound label", () => {
    const options = getLinkOptions([{ value: "depends-on", outbound: "depends on", inbound: "dependent" }]);
    expect(options[1].direction).toBe("inbound");
    expect(options[1].linkType).toBe("depends-on");
    expect(options[1].label).toBe("dependent");
  });

  it("expands multiple entries: 2 options per entry, in order", () => {
    const entries: LinkTypeEntry[] = [
      { value: "depends-on", outbound: "depends on", inbound: "dependent" },
      { value: "context", outbound: "context", inbound: "context for" },
    ];
    const options = getLinkOptions(entries);
    expect(options).toHaveLength(4);

    const [depOut, depIn, ctxOut, ctxIn] = options as [
      LinkOption,
      LinkOption,
      LinkOption,
      LinkOption,
    ];
    expect(depOut).toEqual({ label: "depends on", linkType: "depends-on", direction: "outbound" });
    expect(depIn).toEqual({ label: "dependent", linkType: "depends-on", direction: "inbound" });
    expect(ctxOut).toEqual({ label: "context", linkType: "context", direction: "outbound" });
    expect(ctxIn).toEqual({ label: "context for", linkType: "context", direction: "inbound" });
  });

  it("uses entry.outbound as the outbound label (no fallback needed — always present)", () => {
    const options = getLinkOptions([{ value: "custom-type", outbound: "custom out", inbound: "custom in" }]);
    expect(options[0].label).toBe("custom out");
    expect(options[0].direction).toBe("outbound");
  });

  it("uses entry.inbound as the inbound label", () => {
    const options = getLinkOptions([{ value: "custom-type", outbound: "custom out", inbound: "custom in" }]);
    expect(options[1].label).toBe("custom in");
    expect(options[1].direction).toBe("inbound");
  });

  it("every option carries the correct linkType", () => {
    const options = getLinkOptions([
      { value: "created-by", outbound: "created by", inbound: "creates" },
      { value: "weird-key", outbound: "weird out", inbound: "weird in" },
    ]);
    expect(options.every((o) => o.linkType !== undefined)).toBe(true);
    expect(options[0].linkType).toBe("created-by");
    expect(options[2].linkType).toBe("weird-key");
  });

  it("symmetric entries (same outbound and inbound) are valid", () => {
    const options = getLinkOptions([{ value: "related", outbound: "related to", inbound: "related to" }]);
    expect(options[0].label).toBe("related to");
    expect(options[1].label).toBe("related to");
  });
});
