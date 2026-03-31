# Architecture

## Overview

This project treats Battleship as a pure domain problem and React as a rendering shell around it. That separation is not abstract philosophy — it has direct, practical consequences for testability, maintainability, and the ability to extend the codebase without touching existing logic.

The domain layer contains no React imports. Game rules are plain TypeScript functions. A new game mode (vs-computer) was added without modifying any existing service, utility, or type — only a new hook and a new wiring component. That is the proof the boundary is real.

---

## Folder Structure

```
src/
  app/                        # Sticky header (h1, controls, status slot) and mode routing
  components/
    board/                    # Board, Cell, useBoardNavigation — generic grid rendering + keyboard navigation, no domain knowledge
    game/                     # SinglePlayerGame, VsComputerGame — wiring only
  features/
    battleship/
      components/             # Presentational feature components, props in / callbacks out
      constants/              # BOARD_SIZE, DIFFICULTY_CONFIG, column labels, ship display names
      data/                   # Raw config and parseLayout()
      hooks/                  # useSinglePlayerGame, useVsComputerGame
      services/               # Pure engine functions and AI helper
      types/                  # All domain types — single source of truth
      utils/                  # Coordinate utilities
  lib/                        # Shared utilities — cn() only
  test/                       # Mirrors src/ — one test file per source file
```

The `battleship` feature folder owns everything domain-specific. The top-level `components/` folder holds components that are domain-aware by props but not by logic — `Board` and `Cell` know how to render a grid, not what a ship or shot is.

---

## Layer Responsibilities and Boundaries

### `types/`

The single source of truth for all domain concepts. No logic, no imports from other layers. Adding a concept to the domain means defining a type here first. `any` is forbidden throughout; `unknown` with a type guard is used when the shape is genuinely unknown.

Key types include `CoordinateKey`, `Ship`, `CellStatus`, `ShotResult`, `GameState`, `BoardState`, `VsComputerBoards`, `PlayerId`, `Difficulty`, `DifficultyConfig`, and `HeaderGameStatus`. `HeaderGameStatus` is a discriminated union on `mode` (`"single" | "vsComputer"`) carrying the props required to render `GameStatus` or `VsComputerGameStatus` in the App header.

### `data/`

Parses and validates the raw ship layout once at module load. `parseLayout` throws on invalid input — this is intentional. The layout is static configuration; an error here is a programming mistake, not a runtime condition. Nothing re-parses at runtime.

### `utils/`

Pure functions only. `toKey(col, row)` is the single production site for `CoordinateKey` strings. No other code constructs `"col,row"` strings by interpolation. `fromKey` is the single parse site. `RawCoordinate` tuples do not escape this layer or the data layer.

### `services/`

Pure functions only — no React imports, no hooks. Own all rule evaluation: hit detection, miss detection, sunk logic, game-over logic, AI coordinate selection. Independently unit-testable. A regression here means a game rule is broken.

Key engine functions:

- `resolveShot(coord, positionIndex, shots)` — determines the outcome of a single shot
- `isShipSunk(ship, shots)` — checks whether all of a ship's coordinates have been hit
- `isGameOver(ships, sunkShipIds)` — checks whether every ship in the fleet is sunk
- `computeShipHitCounts(ships, shots)` — returns a map of ship id to hit count
- `nextUnfiredCoordinate(allKeys, shots, fromIndex)` — returns the next unfired coordinate in row-major order after `fromIndex`, wrapping around; returns `null` if all coordinates are fired

### `hooks/`

State orchestration. Connect the domain layer to React's rendering model. Expose typed, view-ready data — not raw state slices. Two hooks exist: `useSinglePlayerGame` for single-player, `useVsComputerGame` for vs-computer. Neither calls the other.

### `components/`

Receive props, render UI, emit typed callbacks. No game rules, no domain calculations, no direct hook calls. The sole exception is the wiring layer (`SinglePlayerGame`, `VsComputerGame`) — these are the only components that call hooks, and they contain no logic of their own.

`SinglePlayerGame` accepts an `onStatusChange` prop and calls it via `useEffect` when `isGameOver` or `shots.size` changes, reporting `{ mode: "single", isGameOver, shotCount }`. The `<h1>` and `<GameStatus>` are no longer rendered here — they live in the App header.

`VsComputerGame` accepts an `onStatusChange` prop and calls it via `useEffect` when `winner`, `activeTurn`, or `isAiThinking` changes, reporting `{ mode: "vsComputer", winner, activeTurn, isAiThinking }`. The `<h1>` and `<VsComputerGameStatus>` are no longer rendered here — they live in the App header.

`GameStatus` and `VsComputerGameStatus` are presentational components with unchanged props and logic. They are now rendered by `App` in the sticky header rather than by their respective wiring components.

`Board` delegates keyboard navigation and focus management to a co-located `useBoardNavigation` hook (`src/components/board/useBoardNavigation.ts`). The hook owns `focusedCoord` state, `boardRef`, arrow key navigation, and post-fire focus advancement. It calls `nextUnfiredCoordinate` from engine.ts to determine where to move focus after a shot. `Board` itself is otherwise purely presentational.

### `app/`

`App.tsx` renders a sticky `<header>` at `top-0` containing the `<h1>Battleship</h1>` landmark, mode toggle (`aria-pressed` buttons), difficulty selector (`role="group" aria-label="Difficulty"`), and an inline status slot.

The status slot renders `<GameStatus>` or `<VsComputerGameStatus>` conditionally based on `headerGameStatus.mode`. `headerGameStatus` is `useState<HeaderGameStatus | null>(null)` — the discriminated union drives which status component appears. It resets to `null` on mode or difficulty change so stale status from the previous game is never displayed.

Each wiring component receives a typed `onStatusChange` callback. These callbacks are stabilised with `useCallback(fn, [])` to prevent an infinite render loop — without stabilisation, the wiring component's `useEffect` would re-fire on every render because `onStatusChange` would be a new reference each time.

Root layout: `<div className="flex-col">` wrapping `<header>` and `<main className="flex-1 justify-start">`.

---

## State Design

**What is persisted** — only what cannot be derived from other persisted state plus constants:

- `shots: Map<CoordinateKey, CellStatus>` — the record of every shot fired
- `lastResult: ShotResult | null` — drives `aria-live` announcements
- Vs-computer additionally persists: `playerShots`, `computerShots`, `playerLastResult`, `computerLastResult`, and `activeTurn`

**What is derived via `useMemo`**:

- Whether a specific cell is hit or missed (lookup in the shots map)
- Whether a ship is sunk (all its cells are in the shots map as hits) — via `isShipSunk` from engine
- Whether the game is over (all ship IDs are in the sunk set) — via `isGameOver` from engine
- Vs-computer: `winner`, `isAiThinking`, `sunkShipIds` (per board), `shipHitCounts` (per board)
- Status labels and counts

The vs-computer hook uses a private `VsComputerReducerState` (not exported, not in `types/index.ts`). `BoardState` objects are assembled in the hook's return value from persisted state and derived values — they are not stored in the reducer.

**Why this shape.** The alternative is to persist derived values — maintain a `sunkShipIds` set by updating it on every shot. That creates a second source of truth that must be kept consistent. If it ever diverges from the shots map, the UI is wrong. Deriving from the shots map is always consistent by construction.

---

## Why `useReducer` Over `useState`

Firing a shot must update two values atomically: the shots map and the last result. With two separate `useState` calls, there is a window between the first and second `setState` where the component has an inconsistent state — the shot is recorded but the result is still the previous one, or vice versa. A consumer of that state (an `aria-live` region, for example) could render during that window.

`useReducer` eliminates this: a single dispatch produces a single new state object. The component never sees an intermediate.

The reducer delegates rule evaluation to pure service functions — it calls `isShipSunk` and `isGameOver` from engine.ts as guards rather than implementing the checks inline. This keeps rules testable in isolation and the reducer focused on state transitions.

**Alternative considered:** `useState` with a combined object (`{ shots, lastResult }`). This would enforce atomicity but at the cost of clarity — setter calls become object spreads, and the transition logic would live inline in event handlers rather than in an explicit reducer case. `useReducer` makes the transition logic explicit and locatable.

---

## AI Timing in vs-Computer Mode

The AI fires after a configurable delay. That delay is a side effect — it involves `setTimeout`, which is not a pure computation and cannot live inside a reducer.

The approach: the reducer handles `PLAYER_FIRE` and `COMPUTER_FIRE` synchronously. A `useEffect` watches for `activeTurn === "computer"` and schedules a `setTimeout`. When the timeout fires, it calls `chooseRandomUnfiredCoordinate` (the AI service function) and dispatches `COMPUTER_FIRE` with the result. The reducer never sees the async operation — only the resolved value.

**Alternative considered:** async thunks or a middleware layer. Rejected as overengineering for this scope. A `useEffect` is the idiomatic React mechanism for scheduling a side effect in response to a state change. Using it here requires no additional infrastructure.

---

## Coordinate Representation

Three representations exist for different layers:

- `RawCoordinate` — `[col, row]` tuple, only in `data/` and `utils/`
- `Coordinate` — `{ col: number; row: number }`, structured object for internal use
- `CoordinateKey` — `${number},${number}` template literal, used as Map keys throughout

`toKey()` is the only legal production site for `CoordinateKey`. This is enforced by convention and ESLint — no inline string interpolation of coordinates anywhere in the codebase. The point of having a single production site is that if the key format ever changes, there is exactly one place to change it.

---

## Two Game Modes Without Shared State

Single-player and vs-computer share no state. Each mode has its own hook. `useVsComputerGame` uses a flat reducer state (`playerShots`, `computerShots`, `playerLastResult`, `computerLastResult`, `activeTurn`) and assembles `BoardState` objects in the return value for each player.

`Board` and `Cell` are shared rendering primitives — they know nothing about game mode. The `disabled` prop on `Board` prevents interaction: the player's own board passes `disabled` (always true, since you observe it but do not fire at it); the opponent's board passes `disabled={activeTurn !== "player" || winner !== null}`.

Adding a third mode would require a new hook and a new wiring component. No existing code would need to change.

---

## Testing Strategy

Prioritized by the cost of a regression.

**Domain (services, utils, data)** — thorough unit coverage. Pure functions, zero dependencies. Every rule, every guard condition, every edge case. The test suite here is the specification.

**Hooks** — `renderHook` with deterministic collaborators. `chooseRandomUnfiredCoordinate` is mocked to a fixed coordinate so AI-turn tests are predictable. `AI_SHOT_DELAY_MS` is exported and overridden to `0` in tests — this avoids `vi.useFakeTimers()`, which conflicts with `userEvent`'s internal timing.

**Components** — rendering, interaction, hit/miss states, sunk messaging, game-over display. Cells targeted by `data-coord` attribute rather than `aria-label` regex to avoid false matches against row-10 cells (e.g. `/B1/` matches `B10`).

---

## Deliberate Omissions

**Player ship placement.** Out of scope. Ships are placed via `generateRandomLayout` on every mount. The architecture supports manual placement — `parseLayout` accepts any valid config — but the UI surface was not built.

**Animations.** Not justified by the requirements. Could be disruptive for users with `prefers-reduced-motion`.

**Global state library.** No Redux, Zustand, or Context. Both hooks are self-contained and the scope does not create a genuine cross-cutting state problem.

**Smarter AI.** The computer fires randomly. A hunt-and-target strategy would only touch `services/ai.ts` — the hook, reducer, and engine are unaffected. This is the cleanest possible extension point.

---

## With More Time

**AI difficulty.** The current AI is stateless and random. A probability-map approach — tracking which cells are consistent with the remaining ships — would be a meaningful improvement and would fit entirely within `services/ai.ts`.

**Keyboard shortcut for firing.** Space fires the focused cell. A global shortcut (e.g. Enter from anywhere) would be a small accessibility improvement.

**Persistent high score or replay.** The architecture supports this: the shots map is serializable. Persistence would be a new concern at the app layer, not a change to the domain.

**Visual board analysis after game over.** Revealing the full layout and highlighting the shot sequence would be a rendering concern — a new display mode for `Board`, not a change to state or services.

**Smarter default ship placement.** `generateRandomLayout` could prefer more spread-out placements to make games more interesting without changing the interface.
