import { ChevronDown } from "lucide-react";
import type { SelectHTMLAttributes } from "react";

export interface SelectFieldProps extends SelectHTMLAttributes<HTMLSelectElement> {
  /**
   * Classes for the wrapping `<div>` that positions the chevron (width/display).
   * Defaults to a full-width block wrapper, matching the common form-field case.
   */
  wrapperClassName?: string;
}

/**
 * Shared native `<select>` primitive that renders a consistently-positioned
 * chevron icon (`appearance-none` + a `ChevronDown` overlay at `right-2.5`)
 * instead of relying on the browser's own arrow, whose spacing varies and
 * otherwise sits flush against the control's border.
 *
 * Owns the chevron layout only — all color/size/border styling is passed in
 * via `className` and applied to the `<select>` itself, so every call site
 * keeps its own visual variant while sharing one spacing implementation.
 * Every other prop (`value`, `onChange`, `disabled`, `id`, `aria-*`, `children`,
 * etc.) forwards directly to the native `<select>`.
 *
 * @example
 * ```tsx
 * <SelectField
 *   value={status}
 *   onChange={(e) => setStatus(e.target.value)}
 *   className="w-full rounded border border-border bg-surface px-3 py-1.5 text-sm text-text"
 * >
 *   <option value="pending">Pending</option>
 * </SelectField>
 * ```
 */
export function SelectField({
  className = "",
  wrapperClassName = "block w-full",
  children,
  ...rest
}: SelectFieldProps) {
  return (
    <div className={`relative ${wrapperClassName}`}>
      <select className={`appearance-none pr-8 ${className}`} {...rest}>
        {children}
      </select>
      <ChevronDown
        size={14}
        className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-500"
        aria-hidden="true"
      />
    </div>
  );
}
