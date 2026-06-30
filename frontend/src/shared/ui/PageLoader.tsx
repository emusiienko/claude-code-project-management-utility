/**
 * Full-page loading indicator shown while a lazy-loaded screen is being fetched.
 *
 * Renders an accessible spinner with `aria-busy` and a visually-hidden label
 * so screen readers announce the loading state (WCAG 2.1 AA).
 */
export function PageLoader() {
  return (
    <div
      role="status"
      aria-busy="true"
      aria-label="Loading page"
      className="flex min-h-64 items-center justify-center"
    >
      {/* Animated ring spinner */}
      <span
        className="h-8 w-8 animate-spin rounded-full border-4 border-border border-t-brand-500"
        aria-hidden="true"
      />
      {/* Visually hidden text for screen readers */}
      <span className="sr-only">Loading…</span>
    </div>
  );
}
