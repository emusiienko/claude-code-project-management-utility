import { type LucideIcon } from "lucide-react";

/** Visual intent variants — controls color; size, spacing, radius, and focus ring are identical across intents. */
export type IconButtonIntent = "neutral" | "destructive";

export interface IconButtonProps {
  /** The Lucide icon component to render (named import from lucide-react). */
  Icon: LucideIcon;
  /**
   * Required accessible name — applied as both `aria-label` and native `title`.
   * The `title` attribute provides a native hover tooltip without pulling in a tooltip library.
   */
  label: string;
  /** Visual intent that controls only the color treatment. Defaults to "neutral". */
  intent?: IconButtonIntent;
  /** When true the button is non-interactive and visually dimmed. */
  disabled?: boolean;
  /** Click handler — wired directly to the underlying <button>. */
  onClick?: React.MouseEventHandler<HTMLButtonElement>;
  /** Additional Tailwind classes for layout overrides (e.g. margin). Do not use for color or sizing. */
  className?: string;
}

/** Maps each intent to its Tailwind color classes (text + hover background). */
const intentClasses: Record<IconButtonIntent, string> = {
  neutral:
    "text-text-secondary hover:text-brand-700 hover:bg-brand-50 focus-visible:ring-brand-500",
  destructive:
    "text-text-secondary hover:text-status-error hover:bg-red-50 focus-visible:ring-status-error",
};

/**
 * Shared icon-button primitive for item/row-level actions (edit, delete, and similar).
 *
 * Owns the entire visual contract — fixed hit area, intent-based color, hover/focus/disabled states —
 * so all screens that consume it cannot drift from each other.
 *
 * The icon is passed as a Lucide component reference; import icons individually at each call site
 * so tree-shaking keeps the initial chunk within the documented bundle budget.
 *
 * @example
 * ```tsx
 * import { Pencil, Trash2 } from "lucide-react";
 * import { IconButton } from "@/shared/components/IconButton";
 *
 * <IconButton Icon={Pencil} label={`Edit ${project.name}`} onClick={handleEdit} />
 * <IconButton Icon={Trash2} label={`Delete ${project.name}`} intent="destructive" onClick={handleDelete} />
 * ```
 */
export function IconButton({
  Icon,
  label,
  intent = "neutral",
  disabled = false,
  onClick,
  className = "",
}: IconButtonProps) {
  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      disabled={disabled}
      onClick={onClick}
      className={[
        // Fixed square hit area — sized for row-level actions
        "inline-flex items-center justify-center",
        "h-8 w-8 rounded",
        // Intent-driven color
        intentClasses[intent],
        // Focus ring — consistent shape and offset across intents
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-1",
        // Disabled state — reduces opacity and blocks pointer events
        "disabled:pointer-events-none disabled:opacity-40",
        // Smooth transition for hover/focus color changes
        "transition-colors duration-150",
        className,
      ]
        .filter(Boolean)
        .join(" ")}
    >
      <Icon size={16} strokeWidth={1.75} aria-hidden="true" />
    </button>
  );
}
