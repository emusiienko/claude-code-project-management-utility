/**
 * useMentionCombobox — drives an ARIA combobox/listbox for autocompleting an
 * in-progress `@role` mention while the user types inside a textarea.
 *
 * The caller reports the textarea's current content and cursor position via
 * `handleSelectionChange` (on every change and every selection/cursor move);
 * this hook derives whether a mention is currently being typed (an `@`
 * preceded by start-of-text or whitespace, with no whitespace yet typed
 * after it), the live-filtered `matches` against `roles`, and keyboard
 * navigation state.
 *
 * While open, this hook registers itself on the app's shared modal-escape
 * stack (`useModalEscape`) so `Escape` dismisses the combobox before it can
 * reach any enclosing modal — no manual `stopPropagation` required, and
 * focus never leaves the textarea since the combobox has no focusable
 * elements of its own.
 *
 * @param value   - The textarea's current content.
 * @param roles   - The project's effective `participant_roles` values.
 * @param onInsert - Called with the selected role and the trigger's
 *                    `[start, end)` range in `value` when a match is chosen.
 */
import { useId, useState } from "react";
import { useModalEscape } from "@/shared/hooks/useModalEscape";

interface Trigger {
  start: number;
  end: number;
}

interface UseMentionComboboxOptions {
  value: string;
  roles: string[];
  onInsert: (role: string, triggerStart: number, triggerEnd: number) => void;
}

export function useMentionCombobox({ value, roles, onInsert }: UseMentionComboboxOptions) {
  const listboxId = useId();
  const [trigger, setTrigger] = useState<Trigger | null>(null);
  const [activeIndex, setActiveIndex] = useState(0);

  const query = trigger ? value.slice(trigger.start + 1, trigger.end) : "";
  const matches = trigger
    ? roles.filter((role) => role.toLowerCase().startsWith(query.toLowerCase()))
    : [];
  const open = trigger !== null;

  useModalEscape(() => setTrigger(null), open);

  /** Re-derives the active mention trigger from the latest content + cursor position. */
  function handleSelectionChange(nextValue: string, cursor: number) {
    const upToCursor = nextValue.slice(0, cursor);
    const at = upToCursor.lastIndexOf("@");
    if (at === -1) {
      setTrigger(null);
      return;
    }
    const charBeforeAt = at > 0 ? upToCursor[at - 1] : undefined;
    const isValidTriggerStart = at === 0 || charBeforeAt === " " || charBeforeAt === "\n";
    const typedQuery = upToCursor.slice(at + 1);
    if (!isValidTriggerStart || /\s/.test(typedQuery)) {
      setTrigger(null);
      return;
    }
    setTrigger({ start: at, end: cursor });
    setActiveIndex(0);
  }

  function selectIndex(index: number) {
    if (!trigger || index < 0 || index >= matches.length) return;
    onInsert(matches[index], trigger.start, trigger.end);
    setTrigger(null);
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (!open) return;
    if (e.key === "ArrowDown") {
      e.preventDefault();
      if (matches.length > 0) setActiveIndex((i) => (i + 1) % matches.length);
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      if (matches.length > 0) setActiveIndex((i) => (i - 1 + matches.length) % matches.length);
    } else if (e.key === "Enter") {
      if (matches.length === 0) return;
      e.preventDefault();
      selectIndex(activeIndex);
    } else if (e.key === "Escape") {
      // Dismissal itself is handled by the shared modal-escape stack above;
      // prevent the keypress from doing anything else (e.g. clearing content).
      e.preventDefault();
    }
  }

  return {
    open,
    matches,
    activeIndex,
    listboxId,
    getOptionId: (index: number) => `${listboxId}-option-${index}`,
    handleSelectionChange,
    handleKeyDown,
    selectIndex,
    setActiveIndex,
    close: () => setTrigger(null),
  };
}
