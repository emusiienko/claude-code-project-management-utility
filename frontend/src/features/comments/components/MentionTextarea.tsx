/**
 * MentionTextarea — a controlled Markdown textarea with an `@role`
 * autocomplete combobox layered on top, for comment `content` fields.
 *
 * Typing `@` (at the start of the text or after whitespace) opens a
 * live-filtered listbox of the project's effective `participant_roles`;
 * arrow keys move the highlighted match, `Enter` inserts it at the trigger
 * position, and `Escape` dismisses the combobox without inserting anything —
 * focus always stays in the textarea. Dismissing the combobox (or continuing
 * to type free text) never mutates `content` beyond what the user typed.
 *
 * The listbox is rendered in a portal anchored (via `position: fixed`) to
 * the textarea's own bounding box, so it is never clipped by an ancestor's
 * `overflow` — every host (story slide-over, task modal, milestone page)
 * scrolls its Comments section, and the Add-Comment form sits at the very
 * bottom of it.
 *
 * @param id             - The textarea's `id`, for label association.
 * @param value          - Current content.
 * @param onChange       - Called with the next content on every edit (typing or a mention insertion).
 * @param roles          - The project's effective `participant_roles` values, offered as mention candidates.
 * @param required       - Native `required` passthrough.
 * @param disabled       - Native `disabled` passthrough.
 * @param rows           - Native `rows` passthrough.
 * @param maxLength      - Native `maxLength` passthrough.
 * @param placeholder    - Native `placeholder` passthrough.
 * @param ariaDescribedBy - Forwarded to `aria-describedby` (field error association).
 * @param className      - Tailwind classes applied to the textarea itself.
 */
import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { useMentionCombobox } from "@/features/comments/hooks/useMentionCombobox";

interface MentionTextareaProps {
  id: string;
  value: string;
  onChange: (value: string) => void;
  roles: string[];
  required?: boolean;
  disabled?: boolean;
  rows?: number;
  maxLength?: number;
  placeholder?: string;
  ariaDescribedBy?: string;
  className: string;
}

interface PopupRect {
  top: number;
  left: number;
  width: number;
}

export function MentionTextarea({
  id,
  value,
  onChange,
  roles,
  required = false,
  disabled = false,
  rows,
  maxLength,
  placeholder,
  ariaDescribedBy,
  className,
}: MentionTextareaProps) {
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const [popupRect, setPopupRect] = useState<PopupRect | null>(null);

  function handleInsert(role: string, triggerStart: number, triggerEnd: number) {
    const insertion = `@${role} `;
    const nextValue = value.slice(0, triggerStart) + insertion + value.slice(triggerEnd);
    onChange(nextValue);
    const cursor = triggerStart + insertion.length;
    // The textarea's own value updates on the next render; defer the
    // selection restore so it lands after that DOM update.
    requestAnimationFrame(() => {
      const el = textareaRef.current;
      if (!el) return;
      el.focus();
      el.setSelectionRange(cursor, cursor);
    });
  }

  const combobox = useMentionCombobox({ value, roles, onInsert: handleInsert });

  // Track the textarea's screen position while the combobox is open so the
  // portal-rendered listbox stays anchored under it regardless of scrolling.
  useEffect(() => {
    if (!combobox.open) {
      setPopupRect(null);
      return;
    }
    function updateRect() {
      const el = textareaRef.current;
      if (!el) return;
      const rect = el.getBoundingClientRect();
      setPopupRect({ top: rect.bottom + 4, left: rect.left, width: rect.width });
    }
    updateRect();
    window.addEventListener("resize", updateRect);
    // `capture: true` also catches scroll on nested scrollable ancestors,
    // since native `scroll` events don't bubble.
    window.addEventListener("scroll", updateRect, true);
    return () => {
      window.removeEventListener("resize", updateRect);
      window.removeEventListener("scroll", updateRect, true);
    };
  }, [combobox.open]);

  function handleChange(e: React.ChangeEvent<HTMLTextAreaElement>) {
    onChange(e.target.value);
    combobox.handleSelectionChange(e.target.value, e.target.selectionStart);
  }

  function handleSelect(e: React.SyntheticEvent<HTMLTextAreaElement>) {
    const el = e.currentTarget;
    combobox.handleSelectionChange(el.value, el.selectionStart ?? el.value.length);
  }

  return (
    <div className="relative">
      <textarea
        ref={textareaRef}
        id={id}
        value={value}
        onChange={handleChange}
        onSelect={handleSelect}
        onKeyDown={combobox.handleKeyDown}
        onBlur={combobox.close}
        required={required}
        disabled={disabled}
        rows={rows}
        maxLength={maxLength}
        placeholder={placeholder}
        role="combobox"
        aria-expanded={combobox.open}
        aria-haspopup="listbox"
        aria-controls={combobox.open ? combobox.listboxId : undefined}
        aria-activedescendant={
          combobox.open && combobox.matches.length > 0
            ? combobox.getOptionId(combobox.activeIndex)
            : undefined
        }
        aria-autocomplete="list"
        aria-describedby={ariaDescribedBy}
        className={className}
      />
      {combobox.open &&
        popupRect &&
        createPortal(
          <ul
            id={combobox.listboxId}
            role="listbox"
            aria-label="Role suggestions"
            style={{
              position: "fixed",
              top: popupRect.top,
              left: popupRect.left,
              width: popupRect.width,
            }}
            className="z-[95] max-h-48 overflow-auto rounded-md border border-border bg-surface py-1 text-sm shadow-lg"
          >
            {combobox.matches.length === 0 ? (
              <li className="px-3 py-1.5 text-text-muted">No matching roles</li>
            ) : (
              combobox.matches.map((role, index) => (
                <li
                  key={role}
                  id={combobox.getOptionId(index)}
                  role="option"
                  aria-selected={index === combobox.activeIndex}
                  // `onMouseDown` (not `onClick`) with `preventDefault` stops
                  // the textarea from blurring before the selection is made,
                  // so focus never leaves it.
                  onMouseDown={(e) => {
                    e.preventDefault();
                    combobox.selectIndex(index);
                  }}
                  onMouseEnter={() => combobox.setActiveIndex(index)}
                  className={`cursor-pointer px-3 py-1.5 ${
                    index === combobox.activeIndex ? "bg-brand-50 text-brand-700" : "text-text"
                  }`}
                >
                  @{role}
                </li>
              ))
            )}
          </ul>,
          document.body,
        )}
    </div>
  );
}
