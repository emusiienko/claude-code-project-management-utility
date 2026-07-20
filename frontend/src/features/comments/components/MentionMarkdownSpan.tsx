/**
 * MentionMarkdownSpan — `react-markdown` `span` renderer that recognizes the
 * `mention` class applied by `createMentionRehypePlugin` and renders those
 * spans as `MentionBadge`; every other `span` renders unchanged.
 *
 * Passed as `components={{ span: MentionMarkdownSpan }}` alongside the
 * rehype plugin so the two stay paired at each call site.
 */
import type { ComponentProps } from "react";
import type { ExtraProps } from "react-markdown";
import { MentionBadge } from "./MentionBadge";

type MentionMarkdownSpanProps = ComponentProps<"span"> & ExtraProps;

export function MentionMarkdownSpan({ node: _node, className, children, ...rest }: MentionMarkdownSpanProps) {
  const isMention = typeof className === "string" && className.split(" ").includes("mention");
  if (!isMention) {
    return (
      <span className={className} {...rest}>
        {children}
      </span>
    );
  }
  return <MentionBadge>{children}</MentionBadge>;
}
