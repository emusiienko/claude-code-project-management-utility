/**
 * CommentMarkdownLink — `react-markdown` `a` renderer for comment content.
 *
 * A link whose href points at this app's own `/comments/:id` permalink route
 * (root-relative, as the backend produces, or absolute, as Copy link
 * produces) navigates via client-side routing instead of a full page reload.
 * Any other link keeps ordinary browser anchor behavior.
 *
 * @param href     - The link target, as written in the Markdown source.
 * @param children - The link's rendered content.
 */

import type { AnchorHTMLAttributes } from "react";
import { useNavigate } from "react-router-dom";
import type { ExtraProps } from "react-markdown";
import { parseCommentPermalinkId } from "@/features/comments/utils/commentPermalink";

type CommentMarkdownLinkProps = AnchorHTMLAttributes<HTMLAnchorElement> & ExtraProps;

/** Intercepts internal comment permalinks; defers to the browser for everything else. */
export function CommentMarkdownLink({ href, children, node: _node, ...rest }: CommentMarkdownLinkProps) {
  const navigate = useNavigate();
  const commentId = href ? parseCommentPermalinkId(href) : undefined;

  if (!commentId) {
    // Not an internal permalink — ordinary anchor, unchanged from plain `react-markdown` rendering.
    return (
      <a href={href} {...rest}>
        {children}
      </a>
    );
  }

  return (
    <a
      href={href}
      onClick={(event) => {
        event.preventDefault();
        navigate(`/comments/${commentId}`);
      }}
      {...rest}
    >
      {children}
    </a>
  );
}
