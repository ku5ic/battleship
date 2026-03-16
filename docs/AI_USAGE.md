# AI Usage

This document describes honestly and specifically where AI assistance was used during this project, how that output was evaluated, and what was changed before it became part of the codebase. All code in this repository was reviewed, understood, and accepted by the author. Final responsibility for every decision belongs to the author.

---

## Guiding principle

AI was treated as a fast-drafting tool, not an authority. No generated output was committed without being read, reasoned about, and deliberately accepted or rewritten. The codebase should be defensible line-by-line in a pair programming session — that standard shaped how AI assistance was used throughout.

---

## Where AI was used

### Project scaffolding

AI was used to generate the initial Vite + React + TypeScript project structure, including the `tsconfig.json` strict mode configuration, the ESLint flat config (`eslint.config.js`) with `typescript-eslint`, `eslint-plugin-jsx-a11y`, and `eslint-plugin-react-hooks`, and the Prettier configuration.

**What was reviewed:** Every config file was read and checked against the actual needs of the project. Several ESLint rules were adjusted after evaluating the generated defaults.

---

### Domain type definitions (`src/features/battleship/types/index.ts`)

AI was used to produce an initial draft of the type file.

**What was changed:**

- `CoordinateKey` was strengthened to a template literal type — the draft used plain `string`.
- `GameState` was restructured to use `ReadonlyMap` and `ReadonlySet`. The draft used mutable variants.
- `ShotResult.sunkShipId` was made optional and typed as `ShipType` rather than `string`.
- `BoardState`, `PlayerId`, `SessionBoards`, and `SessionState` were added in a later session to support the two-board session model. The draft of `SessionState` initially included callbacks (`playerFireShot`, `reset`) which were moved to the hook return interface instead — state types should describe data, not actions.

---

### Coordinate utilities (`src/features/battleship/utils/coordinates.ts`)

AI drafted `toKey`, `fromKey`, `rawToKey`, `isInBounds`, and `deriveOrientation`.

**What was added (not generated):**

- `allBoardKeys()` — needed by both the `Board` component and `chooseRandomUnfiredCoordinate`. The draft did not include it.

---

### Layout parser (`src/features/battleship/data/layout.ts`)

AI drafted `parseLayout` with validation. The initial draft validated position count and bounds but was missing overlap detection and the contiguity check.

**What was added:**

- Overlap detection using a shared `Set<CoordinateKey>` across all ships.
- `assertAligned()` — written from scratch after identifying diagonal and non-contiguous placement as domain invariants the draft missed.

**What was changed:**

- Error messages were rewritten to be specific and testable.
- The function was restructured so the `occupied` set is populated only after all validations pass for a given ship. The draft's ordering caused false overlap errors.

---

### Game engine (`src/features/battleship/services/engine.ts`)

AI drafted `buildPositionIndex`, `resolveShot`, `isShipSunk`, `isGameOver`, and `outcomeToStatus`.

**What was changed:**

- `resolveShot` in the draft mutated the shots map. Rewritten to be pure.
- `isGameOver` had no guard for an empty fleet.
- `outcomeToStatus` was not in the initial draft — added to centralise the mapping.
- All signatures tightened to use `ReadonlyMap` and `readonly` arrays.

**`applyShotToBoard` (added for session mode):**

AI drafted this board-level coordinator which sequences `resolveShot`, updates `shots`, `sunkShipIds`, and `isGameOver`, and returns a new immutable `BoardState`. The draft initially took the position index as a parameter. Changed to build it internally from `board.ships` — the per-call cost is negligible for user-paced shots, and the simpler signature is the better API.

---

### AI service (`src/features/battleship/services/ai.ts`)

AI drafted `chooseRandomUnfiredCoordinate`. The function is four lines and straightforward. No changes were needed to the implementation. The decision to keep it purely functional — no timing, no side effects — was deliberate, with timing owned by the hook's `useEffect` instead.

---

### Single-player hook (`src/features/battleship/hooks/useBattleshipGame.ts`)

AI drafted the hook using `useReducer`.

**What was changed:**

- Switched from `useState` to `useReducer` to make the guard-then-commit pattern atomic.
- `sunkShipIds` and `isGameOver` derivation moved into `useMemo`. The draft computed them inline in the reducer.
- `SHIPS` and `POSITION_INDEX` moved outside the hook. The draft recomputed them on every render.
- The `fireShot` guard (`if (gameOver) return`) was added. The draft accepted shots after the game ended.

---

### Session hook (`src/features/battleship/hooks/useBattleshipSessionGame.ts`)

AI drafted the session hook incrementally across several prompts: the action union, the `PLAYER_FIRE` reducer branch, the `COMPUTER_FIRE` reducer branch, the `useEffect` for AI timing, and the return shape.

**Key decisions made or confirmed during review:**

- The reducer stays synchronous. The `useEffect` owns the `setTimeout` and dispatch. This was an explicit requirement and was correctly reflected in the generated output.
- `isAiThinking` is set atomically inside the reducer — it is derived directly from the shot result and must change in the same state update as `activeTurn`. Setting it in the effect would create a frame where `activeTurn === "computer"` but `isAiThinking === false`.
- `PLAYER_POSITION_INDEX` and `COMPUTER_POSITION_INDEX` are separate module-scope constants despite currently pointing at the same `SHIPS`. The separation is intentional — it makes the code ready for distinct layouts without any structural changes.
- The effect cleanup (`clearTimeout`) correctly cancels the AI timer on reset and unmount. This was verified explicitly and is covered by the reset test in `BattleshipMultiplayerGame.test.tsx`.
- `AI_SHOT_DELAY_MS` is exported so tests can override it to `0` without fake timers.

**What was changed:**

- Initial draft of `buildInitialSessionState` included both boards inside a single `board` object (correct), but an earlier draft had `playerBoard` and `computerBoard` as flat siblings. Corrected to the nested shape.
- The `useEffect` dependency array initially included only `state.activeTurn`. Added `state.winner` and `state.board.player.shots` to match the actual conditions the effect reads.

---

### Board component (`src/components/board/Board.tsx`)

AI drafted the grid structure and roving tabindex pattern. Extended in a later session to support `isReadOnly`.

**`isReadOnly` addition:**

- `onFire` made optional (`onFire?`).
- `isReadOnly?: boolean` added to props.
- `aria-readonly` updated to `isGameOver || isReadOnly`.
- Cell `disabled` prop updated to `isGameOver || isReadOnly`.
- `onFire` call in `handleCellFire` guarded with optional chaining (`onFire?.(fired)`).

**Original changes (still in place):**

- Column header row given `aria-hidden="true"`.
- `handleCellFire` rewritten to advance focus after firing.
- `requestAnimationFrame` deferral added to avoid race with disabled state.
- `aria-readonly` added to the grid element.

---

### Cell component (`src/components/board/Cell.tsx`)

AI drafted the button structure and visual states. No changes to the component for multiplayer — it correctly receives `disabled` as a prop and renders accordingly.

**Original changes (still in place):**

- `buildAriaLabel` written from scratch — the draft only communicated column and row.
- `tabIndex` handling tightened.
- SVG markers added with `aria-hidden="true"`.

---

### Feature components

**`ShotResultAnnouncer`, `GameStatus`, `ShipStatusList`** — original components unchanged. AI drafted initial versions; review changes documented in the original `AI_USAGE.md` remain accurate.

**`GameStatusMultiplayer` (new):**

AI drafted this component. The initial draft used an inline ternary expression directly in JSX. Extracted into a `buildMessage()` function for clarity. The `data-testid` attribute was added after test ambiguity issues with multiple `role="status"` elements in the DOM (two `ShotResultAnnouncer` instances plus `GameStatusMultiplayer`).

---

### App mode toggle (`src/app/App.tsx`)

AI drafted the toggle. `aria-pressed` was in the generated output, which is correct — it communicates the selected mode to screen readers. No changes needed.

---

### Tests

AI generated initial stubs for all test files. The multiplayer-specific tests required the most iteration.

**`useBattleshipSessionGame.test.ts`:**

- AI draft used `vi.useFakeTimers()` throughout. Replaced with exporting `AI_SHOT_DELAY_MS` and mocking it to `0` in tests — eliminates fake-timer complexity entirely and keeps `userEvent` working correctly.
- Mock of `chooseRandomUnfiredCoordinate` to a fixed coordinate (`"9,8"`) makes AI shots deterministic and assertable.

**`BattleshipMultiplayerGame.test.tsx`:**

- Multiple rounds of debugging: `userEvent` with fake timers causes 5s hangs because `userEvent` uses `setTimeout(0)` internally. Resolved by the same approach — zero-delay AI shots via module mock, real timers throughout.
- `getByRole("status")` was ambiguous with multiple `role="status"` elements. Resolved by adding `data-testid="session-status"` to `GameStatusMultiplayer` and querying by testid.
- Cell queries scoped to `within(grid)` rather than `within(section)` to exclude non-cell buttons (Restart, fleet panel) from button count assertions.

**What was rejected in testing:**

- `userEvent.setup({ advanceTimers: vi.advanceTimersByTime })` — does not work reliably with Vitest fake timers. Rejected in favour of the zero-delay mock approach.
- `vi.runAllTimers()` with `act()` — fragile when `userEvent` itself uses timers. Rejected.

---

## What was rejected

- **Global state library.** AI suggested Zustand. Rejected — a single `useReducer` hook is sufficient at this scope.
- **Async reducer.** AI suggested handling AI timing in the reducer via middleware. Rejected — reducers must be synchronous. Timing belongs in `useEffect`.
- **Shared `POSITION_INDEX`.** AI initially suggested one shared position index for both boards. Rejected — separate constants signal distinct ownership and make future divergence easier.
- **Animated shot feedback.** Rejected as out of scope.
- **`React.memo` on `Cell`.** Rejected as premature optimisation.
- **`any` types in test fixtures.** All replaced with properly typed alternatives.

---

## Final responsibility

Every file in this repository was read and understood before being committed. Where generated code was wrong, incomplete, or insufficiently reasoned, it was rewritten. The architecture, the domain model, the session design, the accessibility decisions, and the test coverage strategy reflect deliberate engineering choices made by the author.

AI accelerated the drafting phase. The quality, correctness, and defensibility of the result are the author's responsibility.
