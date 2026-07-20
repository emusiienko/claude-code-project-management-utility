/**
 * createMentionRehypePlugin — a rehype plugin factory for `react-markdown`
 * that splits `@<role>` tokens out of text nodes into their own
 * `span.mention` element when `<role>` exactly matches an entry in `roles`
 * (the project's *current* effective `participant_roles`). Non-matching
 * `@word` tokens are left untouched as plain text.
 *
 * Operates purely on the rendered `hast` tree — `content` itself is never
 * modified, so a mention whose role is later removed from `participant_roles`
 * simply stops being wrapped on the next render, with no data change.
 *
 * Does not descend into `code`/`pre` elements — a literal `@role` shown as
 * code (e.g. in a fenced code block) is left as plain text, not badged.
 *
 * @param roles - The project's current effective `participant_roles` values.
 */
import type { Element, Root, RootContent, Text } from "hast";

const MENTION_PATTERN = /@([A-Za-z0-9_-]+)/g;
const SKIPPED_TAG_NAMES = new Set(["code", "pre"]);

function splitTextNode(node: Text, roles: string[]): RootContent[] {
  const matches = [...node.value.matchAll(MENTION_PATTERN)];
  if (matches.length === 0) return [node];

  const parts: RootContent[] = [];
  let cursor = 0;
  let didSplit = false;

  for (const match of matches) {
    const role = match[1];
    if (!roles.includes(role)) continue;

    const start = match.index ?? 0;
    if (start > cursor) parts.push({ type: "text", value: node.value.slice(cursor, start) });

    const mentionElement: Element = {
      type: "element",
      tagName: "span",
      properties: { className: ["mention"] },
      children: [{ type: "text", value: match[0] }],
    };
    parts.push(mentionElement);
    cursor = start + match[0].length;
    didSplit = true;
  }

  if (!didSplit) return [node];
  if (cursor < node.value.length) parts.push({ type: "text", value: node.value.slice(cursor) });
  return parts;
}

function visit(node: RootContent | Root, roles: string[]): void {
  if (!("children" in node) || !node.children) return;
  const next: RootContent[] = [];
  for (const child of node.children) {
    const isSkippedElement = child.type === "element" && SKIPPED_TAG_NAMES.has(child.tagName);
    if (child.type === "text") {
      next.push(...splitTextNode(child, roles));
    } else if (!isSkippedElement) {
      visit(child, roles);
      next.push(child);
    } else {
      next.push(child);
    }
  }
  node.children = next;
}

export function createMentionRehypePlugin(roles: string[]) {
  return function mentionRehypePlugin() {
    return (tree: Root) => {
      visit(tree, roles);
    };
  };
}
