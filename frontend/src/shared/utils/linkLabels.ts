/**
 * Link label utilities — shared by task-links and story-links features.
 *
 * getLinkLabel: maps a link_type + direction pair to a human-readable badge label.
 * getLinkOptions: expands a list of link_type keys into picker options (outbound + inbound).
 */

export type Direction = "outbound" | "inbound";

interface DirectionLabels {
  outbound: string;
  inbound: string;
}

const LINK_TYPE_LABELS: Record<string, DirectionLabels> = {
  "depends-on": { outbound: "depends on", inbound: "dependent" },
  "created-by": { outbound: "created by", inbound: "creates" },
  context: { outbound: "context", inbound: "context for" },
};

/**
 * Maps a link_type + direction pair to a human-readable label.
 *
 * Used by TaskLinkRow and StoryLinksSection to show direction-aware text in the
 * link type badge instead of the raw slug.
 *
 * @param linkType  - The raw link_type value from the API (e.g. "depends-on").
 * @param direction - The direction relative to the current item: "outbound" | "inbound".
 * @returns A human-readable label. Falls back to the raw linkType for unknown types.
 */
export function getLinkLabel(
  linkType: string,
  direction: Direction | undefined,
): string {
  if (!direction) return linkType;
  return LINK_TYPE_LABELS[linkType]?.[direction] ?? linkType;
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
 * Expands a list of link_type keys from the effective dictionary into picker
 * options for the "Add link" form dropdown.
 *
 * Each key produces two entries: one outbound, one inbound. Unknown keys fall
 * back to the raw key string as the label for both directions.
 *
 * @param linkTypes - Raw link_type keys from the effective project settings.
 * @returns Flat list of `LinkOption` objects ordered outbound then inbound per key.
 */
export function getLinkOptions(linkTypes: string[]): LinkOption[] {
  return linkTypes.flatMap((lt) => {
    const labels = LINK_TYPE_LABELS[lt];
    return [
      { label: labels?.outbound ?? lt, linkType: lt, direction: "outbound" as const },
      { label: labels?.inbound ?? lt, linkType: lt, direction: "inbound" as const },
    ];
  });
}
