/**
 * MentionBadge — accent-colored inline badge for a recognized `@role`
 * mention inside rendered comment content.
 *
 * @param children - The mention text (e.g. "@operator"), rendered as-is.
 */
interface MentionBadgeProps {
  children: React.ReactNode;
}

export function MentionBadge({ children }: MentionBadgeProps) {
  return (
    <span className="rounded bg-brand-100 px-1 py-0.5 text-xs font-medium text-brand-700">
      {children}
    </span>
  );
}
