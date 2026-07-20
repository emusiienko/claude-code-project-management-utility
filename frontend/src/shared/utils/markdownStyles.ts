/**
 * Shared Tailwind arbitrary-property class list for rendering `react-markdown`
 * output consistently across the app (no `@tailwindcss/typography` dependency
 * per `docs/requirements/requirements_web.md`).
 *
 * First promoted from `StoryRightPanel`'s inline description styling when the
 * Comments feature (STORY-008) needed the identical treatment for comment
 * content.
 */
export const MARKDOWN_CONTENT_CLASS =
  "text-sm text-text [&_a]:text-brand-600 [&_a]:underline [&_blockquote]:border-l-2 [&_blockquote]:border-border [&_blockquote]:pl-3 [&_blockquote]:italic [&_blockquote]:text-text-secondary [&_code]:rounded [&_code]:bg-surface-muted [&_code]:px-1 [&_code]:py-0.5 [&_code]:text-xs [&_code]:font-mono [&_h1]:mb-2 [&_h1]:text-base [&_h1]:font-bold [&_h2]:mb-2 [&_h2]:text-sm [&_h2]:font-bold [&_h3]:mb-1 [&_h3]:text-sm [&_h3]:font-semibold [&_li]:ml-4 [&_ol]:my-2 [&_ol]:list-decimal [&_p]:mb-2 [&_p]:last:mb-0 [&_pre]:my-2 [&_pre]:rounded-md [&_pre]:bg-surface-muted [&_pre]:p-3 [&_pre]:text-xs [&_ul]:my-2 [&_ul]:list-disc";
