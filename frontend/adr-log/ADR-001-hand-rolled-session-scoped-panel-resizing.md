# ADR-001: Hand-rolled session-scoped panel resizing

**Date**: 2026-09-13
**Status**: Accepted

**Decision**: Resizable panel pairs in this app are built from one shared hook
(`src/shared/hooks/useResizablePanel.ts`) and one shared separator component
(`src/shared/components/ResizeHandle.tsx`), with no resize library. Each pair's chosen width lives in
a module-level `Map` declared inside the hook's own module and keyed per pair — held for the browser
session, never written to `localStorage` or `sessionStorage`, never carried through React context.
Every pair supplies its own pixel default, minimum, maximum, and neighbour minimum; the hook holds no
defaults of its own.

**Options Considered**:
- `react-resizable-panels`
- A React context holding every pair's width
- `sessionStorage`- or `localStorage`-backed widths, reusing the existing `useLocalStorage` hook
- Bespoke drag handling per pair, with no shared hook or component

**Rationale**:
- `react-resizable-panels` routes all three shells' children through its `Group`/`Panel` components
  and requires reconciling its `collapsible` panel model with the three existing
  `localStorage`-backed collapse toggles, which keep their own state and their own controls. It also
  converts every size constraint to a percentage internally, while the readability bounds here are
  pixel facts.
- `sessionStorage` and `localStorage` both survive a page reload; STORY-006 requires a reload to
  return every pair to its default width.
- A context write on every `pointermove` re-renders every consumer. The module-level map confines
  re-renders to the pair being dragged.
- The map must be module-level rather than component state because the width has to outlive its
  component's unmount — `StorySlideOver` unmounts on close, `AppShell` unmounts when the user
  switches to Sessions mode — while still dying on reload. That is exactly the lifetime a module
  binding has.
- Three pairs is the entire side-by-side surface of this app, and each already owns bespoke shell
  markup and a collapse control it must keep — so a shared hook plus a shared separator is the whole
  shared surface worth having.

**Trade-offs**:
- The drag mechanics, keyboard operation, ARIA separator semantics, and container measurement are
  ours to maintain; there is no library upgrade path for any of them.
- A width held in a module binding is reachable from neither React DevTools nor a test that has not
  imported the module. `__resetPanelWidths` exists solely so tests can clear it between cases.
- A fourth panel pair has to adopt the hook deliberately — nothing in the type system or the build
  forces a new side-by-side layout through it.
