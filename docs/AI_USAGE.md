# AI Usage

This document describes honestly and specifically where AI assistance was used during this project, how that output was evaluated, and what was changed before it became part of the codebase. All code in this repository was reviewed, understood, and accepted by the author. Final responsibility for every decision belongs to the author.

---

## Guiding principle

AI was treated as a fast-drafting tool, not an authority. No generated output was committed without being read, reasoned about, and deliberately accepted or rewritten. The codebase should be defensible line-by-line in a pair programming session — that standard shaped how AI assistance was used throughout.

---

## Where AI was used

### Project scaffolding

AI was used to generate the initial Vite + React + TypeScript project structure, including the `tsconfig.json` strict mode configuration, the ESLint flat config (`eslint.config.js`) with `typescript-eslint`, `eslint-plugin-jsx-a11y`, and `eslint-plugin-react-hooks`, and the Prettier configuration. These are largely mechanical to produce and well-understood in structure.

**What was reviewed:** Every config file was read and checked against the actual needs of the project. Several ESLint rules were adjusted (strictness on `no-explicit-any`, enabling `react/self-closing-comp`) after evaluating the generated defaults.

**Example prompt used:**

> Set up ESLint flat config for a Vite React TypeScript project. Include typescript-eslint strict, jsx-a11y, react-hooks, and prettier compat. Show the full eslint.config.js.

---

### Domain type definitions (`src/features/battleship/types/index.ts`)

AI was used to produce an initial draft of the type file. The prompt described the domain clearly: ships, coordinates, shot outcomes, game state. The draft included most of the right types but used a looser `string` type for coordinate keys.

**What was changed:**

- `CoordinateKey` was strengthened to a template literal type (`\`${number},${number}\``) — the generated draft used plain `string`, which would allow any string to be used as a key without a cast.
- The `GameState` interface was restructured so `shots` uses `ReadonlyMap` and `sunkShipIds` uses `ReadonlySet`. The draft used mutable `Map` and `Set`.
- `ShotResult.sunkShipId` was made optional (`?`) and typed as `ShipType` rather than `string`. The draft had it as a required `string`.

---

### Coordinate utilities (`src/features/battleship/utils/coordinates.ts`)

AI drafted `toKey`, `fromKey`, `rawToKey`, `isInBounds`, and `deriveOrientation`. The logic in each was straightforward enough to verify at a glance.

**What was added (not generated):**

- `allBoardKeys()` — the draft did not include a board enumeration utility. It was added after recognising that both the `Board` component and tests needed a stable, pure source of all 100 keys in row-major order.

**What was reviewed:** The `deriveOrientation` implementation was checked for the single-coordinate edge case and confirmed to default to `"horizontal"` correctly.

---

### Layout parser (`src/features/battleship/data/layout.ts`)

AI was used to draft `parseLayout` with validation. The initial draft validated position count and bounds but was missing overlap detection and the contiguity check.

**What was added:**

- Overlap detection using a shared `Set<CoordinateKey>` across all ships.
- `assertAligned()` — the draft had no check for diagonal or non-contiguous placement. This was written from scratch after identifying it as a required domain invariant.

**What was changed:**

- Error messages were rewritten to be specific and testable (e.g., referencing the ship name, the exact position, and the constraint violated). The generated messages were generic.
- The function was restructured so the `occupied` set is populated only after all validations pass for a given ship, not before. The draft's ordering would have caused false overlap errors.

---

### Game engine (`src/features/battleship/services/engine.ts`)

AI was used to draft `buildPositionIndex`, `resolveShot`, `isShipSunk`, `isGameOver`, and `outcomeToStatus`.

**What was changed:**

- `resolveShot` in the draft mutated the `shots` map directly. This was rewritten so the function is pure — it returns a result and the caller applies state changes. The comment in the final source explains this explicitly.
- `isGameOver` in the draft had no guard for an empty fleet (zero ships would have returned `true`). A length check was added.
- `outcomeToStatus` was not in the initial draft. It was added to centralise the mapping from `ShotOutcome` to `CellStatus`, removing a switch statement that had been inlined in the hook.
- All function signatures were tightened to use `ReadonlyMap` and `readonly` array types where mutation is not intended.

---

### Game hook (`src/features/battleship/hooks/useBattleshipGame.ts`)

AI was used to draft the hook using `useReducer`. The initial draft used `useState` with two separate setters, which led to a fragile pattern where both had to be updated in sync.

**What was changed:**

- Switched to `useReducer` with explicit `FIRE` and `RESET` actions. The reducer structure makes the guard-then-commit pattern for `already-fired` reads clearly in one place.
- `sunkShipIds` and `isGameOver` derivation were moved into `useMemo` calls in the hook body. The draft had them computed inline in the reducer, which mixed domain logic with state machinery.
- `SHIPS` and `POSITION_INDEX` were moved outside the hook. The draft recomputed them inside the hook on every render. This is a meaningful correctness issue: `parseLayout` and `buildPositionIndex` are expensive relative to what hooks normally do inline, and the layout never changes during a session.
- The `fireShot` guard (`if (gameOver) return`) was added. The draft accepted shots after the game ended.

---

### Board component (`src/components/board/Board.tsx`)

AI was used to draft the grid structure and the roving tabindex keyboard navigation pattern.

**What was changed:**

- The column header row was given `aria-hidden="true"`. The draft included it in the accessibility tree, which polluted the row count and confused screen readers.
- The `handleCellFire` function was rewritten to advance focus to the next unfired cell after firing. The draft did not move focus at all, leaving keyboard users stranded on a disabled button after every shot.
- The `requestAnimationFrame` deferral in `handleCellFire` was added after identifying that React's render and the browser's focus call can race if called synchronously. This was not in the generated version.
- `aria-readonly` was added to the grid element to signal the game-over state to assistive technology.

---

### Cell component (`src/components/board/Cell.tsx`)

AI was used to draft the button structure and visual states (hit, miss, untouched).

**What was changed:**

- `buildAriaLabel` was written from scratch. The draft had a minimal label that only communicated column and row. The final label encodes column letter, row number, fired state, and a conditional activation hint for unfired cells.
- The `tabIndex` handling was tightened. The draft set `tabIndex={-1}` unconditionally on disabled cells, which is redundant (disabled buttons are already removed from the tab sequence) and slightly misleading.
- SVG markers (`HitMarker`, `MissMarker`) were added with `aria-hidden="true"` to ensure they are not announced by screen readers. The draft used text characters (`×`, `•`) which would be read aloud.

---

### Feature components (`ShotResultAnnouncer`, `GameStatus`, `ShipStatusList`)

AI was used to draft initial versions of all three.

**What was changed:**

- `ShotResultAnnouncer` in the draft used a single `aria-live` region that was always visible. The final version renders a visually hidden element (`sr-only`) and uses a `key` prop to force React to remount the element on each new result, which reliably triggers re-announcement even when the message text does not change (e.g., two consecutive misses).
- `GameStatus` in the draft used `aria-live` for the game-over message. This was changed to `role="status"` because game-over is a stable state change, not a transient event. Using two separate mechanisms (`aria-live` for shots, `role="status"` for game over) prevents announcements from clobbering each other.
- `ShipStatusList` had no visual distinction between intact and sunk ships other than text. A strikethrough style and muted color were added to communicate sunk state through more than one channel, satisfying the WCAG requirement that information not be conveyed by color alone.

---

### Tests

AI was used to generate initial test file stubs for `coordinates.test.ts`, `layout.test.ts`, `engine.test.ts`, `useBattleshipGame.test.ts`, `Cell.test.tsx`, and `Board.test.tsx`.

**What was added or changed:**

- `layout.test.ts`: the generated tests covered the happy path and a few error cases. Tests for diagonal placement, non-contiguous positions, and the overlap edge case were written manually after implementing `assertAligned`.
- `engine.test.ts`: the generated suite lacked tests for `isShipSunk`, `outcomeToStatus`, and the empty-fleet guard on `isGameOver`. These were added.
- `useBattleshipGame.test.ts`: the generated tests did not cover the no-fire-after-game-over guard. That test was added explicitly because the guard is a deliberate design choice worth protecting.
- `Board.test.tsx`: the generated tests used `getByRole('button')` without name matchers, which meant they would pass even if the accessible labels were completely wrong. All queries were tightened to use `{ name: /pattern/ }` matchers that verify the actual label content.
- All test fixtures were reviewed for type safety. Several generated tests used bare string literals where `CoordinateKey` was expected; these were cast explicitly.

---

### Documentation (`README.md`, `ARCHITECTURE.md`)

AI was used to produce initial drafts of both documents.

**What was changed:**

- `ARCHITECTURE.md`: the generated draft described the architecture accurately at a high level but contained several vague justifications ("this is a common pattern", "this improves maintainability"). These were rewritten with specific, defensible reasoning — for example, why `useReducer` rather than `useState`, why `SHIPS` is parsed outside the hook, and why `sunkShipIds` is derived rather than persisted.
- `README.md`: the generated version included a features section that described items out of scope for the assignment. This was trimmed. The accessibility section was expanded with specifics rather than generic bullet points.

---

## What was rejected

- **Global state library suggestion.** AI suggested adding Zustand for game state. This was rejected. The assignment scope does not justify a global state library. A single `useReducer` hook with a clean interface is both simpler and easier to test.
- **Animated shot feedback.** AI suggested CSS transitions on cell state changes. This was rejected as out of scope and potentially disruptive for users with motion sensitivity preferences.
- **Ship placement UI.** AI offered to scaffold a ship placement interface. This was explicitly out of scope and declined.
- **Memoised cell rendering with `React.memo`.** AI suggested wrapping `Cell` in `React.memo`. This was rejected as premature optimisation. The board renders 100 cells but the component is cheap; the added indirection is not justified without a measured performance problem.
- **`any` types in test fixtures.** Several generated test helpers used `as any` to bypass type checking. All of these were replaced with properly typed alternatives.

---

## Final responsibility

Every file in this repository was read and understood before being committed. Where generated code was wrong, incomplete, or insufficiently reasoned, it was rewritten. The architecture, the domain model, the accessibility decisions, and the test coverage strategy reflect deliberate engineering choices made by the author.

AI accelerated the drafting phase. The quality, correctness, and defensibility of the result are the author's responsibility.
