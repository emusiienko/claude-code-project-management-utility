/**
 * Generic placeholder screen rendered by every not-yet-implemented area.
 *
 * Displays the screen title and a "coming soon" state so the navigation
 * is complete and testable from day one. STORY-003+ replace a screen's
 * index.tsx with the real implementation — this component is not used after
 * the real screen exists.
 */

interface PlaceholderScreenProps {
  /** Display name shown as the screen heading. */
  title: string;
  /** Optional additional description for the screen's future purpose. */
  description?: string;
}

/**
 * Minimal placeholder that makes every route visually distinct and testable
 * without implementing any domain logic.
 */
export function PlaceholderScreen({
  title,
  description,
}: PlaceholderScreenProps) {
  return (
    <section
      aria-labelledby="placeholder-heading"
      className="flex flex-col items-center justify-center py-24 text-center"
    >
      {/* Icon — a simple construction sign conveying "in progress" */}
      <span
        aria-hidden="true"
        className="mb-4 text-5xl"
        role="img"
        aria-label="Under construction"
      >
        🚧
      </span>

      <h1
        id="placeholder-heading"
        className="mb-2 text-2xl font-semibold text-text"
      >
        {title}
      </h1>

      <p className="max-w-xs text-sm text-text-secondary">
        {description ??
          "This screen is coming soon. Implementation will be added in a future story."}
      </p>
    </section>
  );
}
