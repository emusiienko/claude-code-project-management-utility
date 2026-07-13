/**
 * Unit tests for the linkLabels shared utility — STORY-018 + STORY-019.
 *
 * Coverage:
 * - getLinkLabel: known link types return direction-aware labels;
 *   unknown types fall back to the raw slug; undefined direction falls back.
 * - getLinkOptions: each key produces two entries (outbound + inbound);
 *   unknown keys fall back to the raw key string for both directions;
 *   empty input returns empty array.
 */

import { describe, it, expect } from "vitest";
import { getLinkLabel, getLinkOptions } from "./linkLabels";
import type { LinkOption } from "./linkLabels";

// ---------------------------------------------------------------------------
// getLinkLabel — STORY-018
// ---------------------------------------------------------------------------

describe("getLinkLabel", () => {
  // Known types — outbound
  it('returns "depends on" for depends-on / outbound', () => {
    expect(getLinkLabel("depends-on", "outbound")).toBe("depends on");
  });

  it('returns "created by" for created-by / outbound', () => {
    expect(getLinkLabel("created-by", "outbound")).toBe("created by");
  });

  it('returns "context" for context / outbound', () => {
    expect(getLinkLabel("context", "outbound")).toBe("context");
  });

  // Known types — inbound
  it('returns "dependent" for depends-on / inbound', () => {
    expect(getLinkLabel("depends-on", "inbound")).toBe("dependent");
  });

  it('returns "creates" for created-by / inbound', () => {
    expect(getLinkLabel("created-by", "inbound")).toBe("creates");
  });

  it('returns "context for" for context / inbound', () => {
    expect(getLinkLabel("context", "inbound")).toBe("context for");
  });

  // Graceful degradation — unknown types
  it("returns the raw slug for an unknown link_type with outbound direction", () => {
    expect(getLinkLabel("unknown-type", "outbound")).toBe("unknown-type");
  });

  it("returns the raw slug for an unknown link_type with inbound direction", () => {
    expect(getLinkLabel("unknown-type", "inbound")).toBe("unknown-type");
  });

  // Undefined direction
  it("returns the raw slug when direction is undefined", () => {
    expect(getLinkLabel("depends-on", undefined)).toBe("depends-on");
  });

  it("returns the raw slug for unknown type and undefined direction", () => {
    expect(getLinkLabel("mystery-link", undefined)).toBe("mystery-link");
  });
});

// ---------------------------------------------------------------------------
// getLinkOptions — STORY-019
// ---------------------------------------------------------------------------

describe("getLinkOptions", () => {
  it("returns an empty array for an empty linkTypes list", () => {
    expect(getLinkOptions([])).toEqual([]);
  });

  it("returns two entries per known link_type key", () => {
    const options = getLinkOptions(["depends-on"]);
    expect(options).toHaveLength(2);
  });

  it("first entry is outbound for a known key", () => {
    const options = getLinkOptions(["depends-on"]);
    expect(options[0].direction).toBe("outbound");
    expect(options[0].linkType).toBe("depends-on");
    expect(options[0].label).toBe("depends on");
  });

  it("second entry is inbound for a known key", () => {
    const options = getLinkOptions(["depends-on"]);
    expect(options[1].direction).toBe("inbound");
    expect(options[1].linkType).toBe("depends-on");
    expect(options[1].label).toBe("dependent");
  });

  it("expands multiple keys: 2 entries per key, in order", () => {
    const options = getLinkOptions(["depends-on", "context"]);
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

  it("falls back to the raw key for an unknown link_type (outbound entry)", () => {
    const options = getLinkOptions(["my-custom-type"]);
    expect(options[0].label).toBe("my-custom-type");
    expect(options[0].direction).toBe("outbound");
  });

  it("falls back to the raw key for an unknown link_type (inbound entry)", () => {
    const options = getLinkOptions(["my-custom-type"]);
    expect(options[1].label).toBe("my-custom-type");
    expect(options[1].direction).toBe("inbound");
  });

  it("every entry carries the correct linkType regardless of whether it is known", () => {
    const options = getLinkOptions(["created-by", "weird-key"]);
    expect(options.every((o) => o.linkType !== undefined)).toBe(true);
    expect(options[0].linkType).toBe("created-by");
    expect(options[2].linkType).toBe("weird-key");
  });
});
