/**
 * Link label utilities — shared by task-links and story-links features.
 *
 * getLinkLabel: looks up a link_type + direction pair in the structured entries
 *   returned by the effective settings API. No hardcoded map.
 * getLinkOptions: expands a list of LinkTypeEntry objects into picker options
 *   (outbound + inbound) for the "Add link" form dropdown.
 */

import type { LinkTypeEntry } from "@/api/types";

export type Direction = "outbound" | "inbound";

/**
 * Looks up a human-readable badge label for a link_type + direction pair.
 *
 * The entries are passed in from the caller, which reads them from the
 * effective project settings already in the TanStack Query cache.
 *
 * @param entries   - Structured link_types from the effective settings API.
 * @param value     - The raw link_type value stored in the link record (e.g. "depends-on").
 * @param direction - The direction relative to the current item: "outbound" | "inbound".
 * @returns A human-readable label. Falls back to the raw value for unknown types or
 *          undefined direction — no crash.
 */
export function getLinkLabel(
  entries: LinkTypeEntry[],
  value: string,
  direction: Direction | undefined,
): string {
  if (!direction) return value;
  const entry = entries.find((e) => e.value === value);
  if (!entry) return value;
  return entry[direction];
}

/** A single option in the "Add link" type picker. */
export interface LinkOption {
  /** Human-readable label shown in the dropdown. */
  label: string;
  /** Raw link_type value sent to the API. */
  linkType: string;
  /** Direction from the current item's perspective. */
  direction: Direction;
}

/**
 * Expands a list of structured link_types entries into picker options for the
 * "Add link" form dropdown.
 *
 * Each entry produces two options: one outbound (using entry.outbound as label)
 * and one inbound (using entry.inbound as label). The raw entry.value is used
 * as the linkType field in both options.
 *
 * @param entries - Structured link_types from the effective project settings.
 * @returns Flat list of `LinkOption` objects ordered outbound then inbound per entry.
 */
export function getLinkOptions(entries: LinkTypeEntry[]): LinkOption[] {
  return entries.flatMap((entry) => [
    { label: entry.outbound, linkType: entry.value, direction: "outbound" as const },
    { label: entry.inbound, linkType: entry.value, direction: "inbound" as const },
  ]);
}
