---
name: wcag-react
description: Enforce WCAG 2.2 AA accessibility in React and TypeScript. Use this skill whenever building or modifying interactive components, forms, live regions, keyboard navigation, focus management, or any UI element where accessibility is relevant. Triggers include: adding a new component with interactive elements, implementing keyboard navigation, writing aria-* attributes, creating live announcement regions, handling focus after state changes, building grid or list components, adding status messages, or reviewing any component for accessibility compliance. Always consult this skill before producing accessible React UI code.
---

# WCAG 2.2 AA React Skill

This skill encodes the accessibility patterns, decision rules, and implementation details for building WCAG 2.2 AA compliant React interfaces. Read before writing or modifying any interactive UI.

---

## Non-negotiable baseline

- Interactive elements are semantic HTML: `<button>`, `<a>`, `<input>` — never `<div onClick>`
- Every interactive element has an accessible name (visible label, `aria-label`, or `aria-labelledby`)
- Color is never the sole communication channel for state — always pair with icon, text, pattern, or shape
- Contrast meets AA at every state: default, hover, focus, disabled
- Touch targets meet minimum size at all breakpoints including 320px width

---

## Semantic HTML decisions

| Pattern           | Correct element                                     | Never use                                         |
| ----------------- | --------------------------------------------------- | ------------------------------------------------- |
| Clickable cell    | `<button type="button">`                            | `<div onClick>`                                   |
| Navigation region | `<nav>`                                             | `<div role="navigation">` unless genuinely needed |
| Status panel      | `<section aria-label="...">`                        | unlabelled `<div>`                                |
| List of items     | `<ul>` + `<li>`                                     | `<div>` + `<div>`                                 |
| Grid of cells     | `role="grid"` with `role="row"` + `role="gridcell"` | flat div structure                                |

---

## Accessible names

Every cell, button, and region needs a computed, meaningful name.

**Cell pattern (board grid):**

```
"A1, not fired. Press Space to fire"   ← fireable
"C4, hit"                               ← fired, hit
"J10, miss"                             ← fired, miss
```

Build accessible names from: column letter + row number + state label. Append activation hint only on fireable cells — not on every already-fired cell. Never rely on position alone.

**Button names:** use visible text when possible. `aria-label` only when visual text cannot convey the full meaning.

**Region names:** use `aria-label` on `<section>` and `<nav>`. Use `aria-labelledby` when a heading is already visible.

---

## Grid keyboard navigation (roving tabindex)

For composite widgets like `role="grid"`:

1. Only one cell in the grid has `tabIndex={0}` at any time — all others are `tabIndex={-1}`
2. Arrow keys move the active cell — update `tabIndex` state, call `.focus()` on the new element
3. Space / Enter fires the active cell
4. After a shot fires, advance focus to the next unfired cell in row-major order

**Critical timing:** defer `.focus()` with `requestAnimationFrame` after firing. Without this, the browser may focus a button that is about to become `disabled` and silently drop focus.

```ts
requestAnimationFrame(() => {
  boardRef.current
    ?.querySelector<HTMLElement>(`[data-coord="${next}"]`)
    ?.focus();
});
```

**`aria-readonly` on grid:** set `aria-readonly={isGameOver}` on the grid element to signal non-interactivity without removing keyboard focus entirely.

---

## Live regions

Use live regions for dynamic content that appears without user navigation. Two distinct types:

| Type                 | Element / role                            | Use for                                      |
| -------------------- | ----------------------------------------- | -------------------------------------------- |
| Transient events     | `aria-live="polite"` visually hidden span | Shot results: hit, miss, sunk, already-fired |
| Stable state changes | `role="status"`                           | Turn changes, game over, winner declaration  |

**Never combine them.** If a shot result and a turn change fire at the same time (e.g., after a miss), the `aria-live` region announces the shot; `role="status"` announces the turn. Separate announcers prevent clobbering.

**Repeated announcements:** if the same message may repeat (e.g., two consecutive misses), use the `key` prop to force a remount of the announcer component. Screen readers only announce content when the DOM changes.

```tsx
<ShotResultAnnouncer key={announcerKey} result={lastResult} />
```

**Multiple concurrent event sources:** mount one `ShotResultAnnouncer` per independent event source (e.g., one for the player's board, one for the computer's board in vs-computer mode). A single shared announcer will be clobbered when events arrive close together.

---

## Visually hidden content

Use a `VisuallyHidden` primitive (not raw `sr-only` class strings scattered across components):

```tsx
// Correct
<VisuallyHidden>
  <span aria-live="polite">{message}</span>
</VisuallyHidden>

// Wrong — sr-only class string in every consumer
<span className="sr-only" aria-live="polite">{message}</span>
```

The standard visually-hidden CSS (position absolute, 1px clip, no overflow) must not use `display: none` or `visibility: hidden` — those hide from screen readers too.

---

## Focus management rules

- Focus rings must be visible against every background the element can appear on
- Use `focus-visible` pseudo-class (not `focus`) to show rings only for keyboard navigation
- High-contrast ring colour (e.g., yellow against dark board) — not the browser default
- `ring-offset` provides a small gap so the ring doesn't blend with adjacent elements
- Never remove focus rings without a replacement — `outline: none` without `focus-visible` compensation is a WCAG failure

---

## Disabled vs read-only

- `disabled` on a `<button>` removes it from tab order and prevents activation — correct for fired cells
- `aria-readonly="true"` on a container signals the subtree is non-interactive but allows browsing — correct for the player's own board in vs-computer mode (cells are visible but not fireable)
- Do not use `aria-disabled` as a substitute for `disabled` unless you need the element to remain focusable

---

## Color and state communication

Never use color alone. Every state must have a secondary indicator:

| State       | Color             | Secondary                         |
| ----------- | ----------------- | --------------------------------- |
| Hit         | Red background    | × icon (SVG)                      |
| Miss        | Muted/grey        | • dot (SVG)                       |
| Sunk ship   | Opacity reduction | Strikethrough text + "Sunk" label |
| Active turn | —                 | Status text announcement          |

Icon SVGs must be `aria-hidden="true"` — the accessible name on the cell or the live region carries the state information. Don't double-announce.

---

## Testing accessibility

Assertions to include in component tests:

```ts
// Cell has correct accessible name
expect(cell).toHaveAccessibleName(/A1, not fired/i);

// Fired cell is disabled
expect(cell).toBeDisabled();

// Live region is present
expect(screen.getByRole("status")).toBeInTheDocument();

// Grid has accessible name
expect(
  screen.getByRole("grid", { name: /Battleship board/i }),
).toBeInTheDocument();

// Section has accessible name
expect(
  screen.getByRole("region", { name: /Fleet status/i }),
).toBeInTheDocument();
```

Do not test implementation details like class names or inline styles for accessibility. Test what the browser exposes to assistive technology.

---

## Checklist before shipping a component

- [ ] All interactive elements are semantic HTML with correct `type` attribute
- [ ] Every interactive element has an accessible name
- [ ] Keyboard navigation is complete: Tab to enter, arrow keys within composite widget, Space/Enter to activate
- [ ] Focus is never lost or trapped unexpectedly
- [ ] Focus advancement after state changes uses `requestAnimationFrame`
- [ ] Color state is backed by a non-colour indicator
- [ ] Live regions are present for dynamic content; correct type for correct content category
- [ ] Repeated announcements use `key` remount
- [ ] `aria-readonly` / `disabled` chosen deliberately based on whether focus is needed
- [ ] Focus rings are visible against all backgrounds the element can appear on
