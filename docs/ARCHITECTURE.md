# Architecture

## Overview

The game is a pretext. The actual subject is layer separation, state design, and the discipline of keeping domain logic independent of the framework that renders it.

The domain layer contains no React imports. Game rules are plain TypeScript functions. State transitions live in a dedicated engine layer: pure `(state, action) => state` reducers consumed by two independent callers, React hooks via `useReducer` and a standalone CLI runner via direct function calls. The CLI was not added as a demonstration. It was added because the layer boundaries made it trivial, and its existence is the proof those boundaries are real. A second game mode (vs-computer) was added by creating a new engine module, a new hook, a new wiring component, a new AI service, and new type definitions. No existing rule evaluation logic was modified in the process. Services, utilities, and the original single-player engine were extended, not rewritten.

---

## Folder Structure

```
src/
  app/                        # Sticky header (h1, controls, status slot) and mode routing
  battleship/
    components/               # Presentational feature components, props in / callbacks out
    constants/                # DIFFICULTY_CONFIG, ship display names, shot outcome labels
    data/                     # Raw config (RAW_GAME_CONFIG), layout parser (test-only)
    engine/                   # Pure (state, action) => state reducers and selectors, no React
    hooks/                    # useSinglePlayerGame, useVsComputerGame: wiring over engine/
    services/                 # Pure rule evaluation and AI helper, no React
    types/                    # All domain types: single source of truth
    utils/                    # Coordinate utilities
  cli/                        # Terminal runner: index.ts (entry), loop.ts, renderer.ts, input.ts
  components/
    board/                    # Board, Cell, useBoardNavigation: generic grid rendering + keyboard navigation, no domain knowledge
    game/                     # SinglePlayerGame, VsComputerGame: wiring only
  lib/                        # Shared utilities: cn() only
  test/                       # Mirrors src/: one test file per source file
```

The `battleship/` folder owns everything domain-specific. The top-level `components/` folder holds components that are domain-aware by props but not by logic. `Board` and `Cell` know how to render a grid, not what a ship or a shot is. This distinction matters: `Board` could render a Minesweeper grid or a crossword without changing its implementation.

---

## Layer Responsibilities and Boundaries

### `types/`

The single source of truth for all domain concepts. No logic, no imports from other layers. Adding a concept to the domain means defining a type here first. This is the entry point for any new feature.

`any` is forbidden throughout the codebase (ESLint enforces this). Where the shape is genuinely unknown, `unknown` with a type guard is used. The alternative, permitting `any` at boundaries and casting later, was rejected because it defers type errors to runtime and makes refactoring unsafe.

Key types include `CoordinateKey`, `Ship`, `CellStatus`, `ShotResult`, `GameState`, `BoardState`, `VsComputerBoards`, `PlayerId`, `Difficulty`, `DifficultyConfig`, and `HeaderGameStatus`. `HeaderGameStatus` is a discriminated union on `mode` (`"single" | "vsComputer"`) carrying the props required to render the correct status component in the App header.

### `data/`

Owns the raw ship configuration (`RAW_GAME_CONFIG`). Production code reads only `shipTypes` (sizes and counts), which `generateRandomLayout` in `services/placement.ts` consumes to build random fleets. The `layout` entries are static fixtures used exclusively by `parseLayout` in test files to construct deterministic fleets.

`parseLayout` validates a raw config into typed `Ship` records and throws on any violation. Throwing was chosen over returning an error type because the layout is static data. An invalid layout is a programming mistake, not a runtime condition, and should fail loudly during development.

### `utils/`

Pure functions only. `toKey(col, row)` is the single production site for `CoordinateKey` strings. No other code constructs `"col,row"` strings by interpolation. This is enforced by convention and code review. `fromKey` is the single parse site. `RawCoordinate` tuples do not escape this layer or the data layer.

The point of having a single production site is that if the key format ever changes, there is exactly one place to change it. The alternative, allowing inline interpolation, would scatter format knowledge across every file that constructs a coordinate key, making a format change a codebase-wide find-and-replace exercise.

### `services/`

Pure functions only. No React imports, no hooks, no side effects. Own all rule evaluation: hit detection, miss detection, sunk logic, game-over logic, AI coordinate selection, random fleet generation. Independently unit-testable with no setup beyond function arguments.

Key functions in `services/engine.ts`:

- `resolveShot(coordinate, shots, positionIndex)`: determines the outcome of a single shot
- `isShipSunk(ship, shots)`: checks whether all of a ship's coordinates have been hit
- `isGameOver(ships, sunkShipIds)`: checks whether every ship in the fleet is sunk
- `computeShipHitCounts(ships, shots)`: returns a map of ship id to hit count
- `nextUnfiredCoordinate(allKeys, shots, fromIndex)`: returns the next unfired coordinate in row-major order after `fromIndex`, wrapping around; returns `null` if all coordinates are fired

Services own rule evaluation but not state transitions; that responsibility belongs to `engine/`. Rules can then be tested without constructing reducer state, and reducer tests can verify transitions without re-testing the rules.

### `engine/`

Pure `(state, action) => state` reducer factories and selectors. No React imports, no hooks, no side effects. Each module exports a factory function that closes over fleet data (position indexes) and returns a standard reducer:

- `engine/singlePlayer.ts`: `createSinglePlayerReducer(ships, positionIndex)` returns a reducer handling `FIRE` and `RESET`. Exports `SinglePlayerState`, `SinglePlayerAction`, and `createSinglePlayerInitialState()`.
- `engine/vsComputer.ts`: `createVsComputerReducer(playerPositionIndex, computerPositionIndex)` returns a reducer handling `PLAYER_FIRE`, `COMPUTER_FIRE`, and `RESET`. Exports `VsComputerState`, `VsComputerAction`, `createVsComputerInitialState()`, and `selectWinner()`.

The engine layer was extracted specifically because reducer logic is consumed by two independent callers: React hooks (via `useReducer`) and the CLI runner (via direct function calls). Without this extraction, the reducer would live inline in the hook, and the CLI would need to either import React or duplicate the logic. Both alternatives are worse: importing React in a terminal program is wrong, and duplicating logic creates two sources of truth that can diverge.

State and action types are co-located with their reducer in `engine/`, not in `types/index.ts`. They are internal to the state machine rather than shared domain concepts. Putting all types in `types/` was rejected because it would couple unrelated consumers to engine internals and obscure which types belong to which reducer.

### `hooks/`

React wiring over `engine/`. Each hook imports a reducer factory from `engine/`, passes it to `useReducer`, and derives view-ready data via `useMemo`. The hook body contains no reducer logic. It handles only side-effect coordination (AI timing via `useEffect`) and derived value assembly.

Two hooks exist: `useSinglePlayerGame` for single-player, `useVsComputerGame` for vs-computer. Neither calls the other. A single hook with a mode parameter was rejected because the two modes have different state shapes, different action types, and different side effects. Combining them would mean the hook always carries the complexity of both modes, branching internally on the mode parameter. Two focused hooks are simpler to read, test, and extend independently.

### `components/`

Receive props, render UI, emit typed callbacks. No game rules, no domain calculations, no direct hook calls. The sole exception is the wiring layer (`SinglePlayerGame`, `VsComputerGame`). These are the only components that call hooks, and they contain no logic of their own.

`SinglePlayerGame` accepts an `onStatusChange` prop and calls it via `useEffect` when `isGameOver` or `shots.size` changes, reporting `{ mode: "single", isGameOver, shotCount }`. `VsComputerGame` accepts an `onStatusChange` prop and calls it via `useEffect` when `winner`, `activeTurn`, or `isAiThinking` changes, reporting `{ mode: "vsComputer", winner, activeTurn, isAiThinking }`.

`GameStatus` and `VsComputerGameStatus` are presentational components rendered by `App` in the sticky header rather than by their respective wiring components. This keeps wiring components focused: they wire state to props, nothing more.

Arrow key navigation and roving tabindex live in `useGridNavigation`, a shared hook also consumed by the placement grid. `Board` uses `useBoardNavigation`, a thin wrapper that adds post-fire focus advancement by calling `nextUnfiredCoordinate` from `services/engine.ts`. `Board` itself is otherwise purely presentational.

### `app/`

`App.tsx` renders a sticky header via `AppShellHeader` from `@nuka-ui/core`, containing the page heading, a mode toggle (`Tabs`/`TabsTrigger`), a difficulty selector (`RadioGroup`/`Radio`), and an inline status slot.

The status slot renders `<GameStatus>` or `<VsComputerGameStatus>` conditionally based on `headerGameStatus.mode`. `headerGameStatus` is `useState<HeaderGameStatus | null>(null)`. The discriminated union drives which status component appears. It resets to `null` on mode or difficulty change so stale status from the previous game is never displayed.

Each wiring component receives a typed `onStatusChange` callback. These callbacks are stabilised with `useCallback(fn, [])` to prevent an infinite render loop. Without stabilisation, the wiring component's `useLayoutEffect` would re-fire on every render because `onStatusChange` would be a new reference each time.

---

## State Design

**What is persisted:** only what cannot be derived from other persisted state plus constants:

- `shots: Map<CoordinateKey, CellStatus>`: the record of every shot fired
- `lastResult: ShotResult | null`: drives `aria-live` announcements
- Vs-computer additionally persists: `playerShots`, `computerShots`, `playerLastResult`, `computerLastResult`, and `activeTurn`

**What is derived via `useMemo`**:

- Whether a specific cell is hit or missed (lookup in the shots map)
- Whether a ship is sunk (all its cells are in the shots map as hits), via `isShipSunk` from services
- Whether the game is over (all ship IDs are in the sunk set), via `isGameOver` from services
- Vs-computer: `winner`, `isAiThinking`, `sunkShipIds` (per board), `shipHitCounts` (per board)
- Status labels and counts

State types (`SinglePlayerState`, `VsComputerState`) and action types are defined in `engine/` alongside their reducers. `BoardState` objects are assembled in the hook's return value (or by the CLI loop's `toBoardState` helper) from persisted state and derived values. They are not stored in the reducer.

**Why this shape.** The alternative is to persist derived values: maintain a `sunkShipIds` set by updating it on every shot. That creates a second source of truth that must be kept consistent with the shots map. If the two ever diverge, the UI shows an incorrect game state. Deriving from the shots map is always consistent by construction. The cost is recomputation on every render, but `useMemo` ensures this happens only when the shots map actually changes, and for a grid of at most 400 cells, the computation is negligible.

---

## Why `useReducer` Over `useState`

Firing a shot must update two values atomically: the shots map and the last result. With two separate `useState` calls, there is a window between the first and second `setState` where the component has an inconsistent state: the shot is recorded but the result is still the previous one, or vice versa. A consumer of that state (an `aria-live` region, for example) could render during that window and announce the wrong result.

`useReducer` eliminates this: a single dispatch produces a single new state object. The component never sees an intermediate.

The single-player reducer (in `engine/`) delegates rule evaluation to pure service functions, calling `isGameOver` and `selectSunkShipIds` from `services/engine.ts` as a game-over guard rather than implementing the checks inline. The vs-computer reducer delegates that guard to the hook layer. In both cases, rules stay testable in isolation and reducers stay focused on state transitions.

**Alternatives considered:**

- `useState` with a combined object (`{ shots, lastResult }`). This would enforce atomicity but push transition logic into event handlers as inline object spreads. The logic becomes harder to locate, harder to audit, and impossible to share with the CLI runner without extraction. `useReducer` makes transition logic explicit, locatable in one file, and shareable.
- Context or Zustand for global state management. Rejected because no genuine cross-cutting state need exists at this scope. Each game mode is self-contained. Introducing a global store would add indirection without solving a real problem. That kind of abstraction exists to satisfy a pattern, not a requirement.

---

## AI Timing in vs-Computer Mode

The AI fires after a configurable delay. That delay is a side effect. It involves `setTimeout`, which is not a pure computation and cannot live inside a reducer.

The approach: the reducer handles `PLAYER_FIRE` and `COMPUTER_FIRE` synchronously. A `useEffect` watches for `activeTurn === "computer"` and schedules a `setTimeout`. When the timeout fires, it calls `chooseRandomUnfiredCoordinate` (the AI service function) and dispatches `COMPUTER_FIRE` with the result. The reducer never sees the async operation, only the resolved value.

**Alternative considered:** async thunks or a middleware layer. Rejected because a `useEffect` is the idiomatic React mechanism for scheduling a side effect in response to a state change, and it requires no additional infrastructure. A middleware layer would be justified if there were multiple async workflows to coordinate. There is one. Adding infrastructure for one use case is overhead that makes the codebase harder to follow for anyone reading it for the first time.

---

## CLI Runner

A standalone terminal interface in `src/cli/` that drives the same engine reducers and service functions that the React hooks consume. The CLI uses `engine/`, `services/`, `utils/`, `constants/`, and `data/` with zero modification and zero React dependency. No adapter layer, no abstraction. The same function calls, the same state shapes, the same rule evaluation.

That the CLI works at all is the strongest evidence the layer boundaries are real: a second consumer in a completely different runtime environment (Node terminal vs browser DOM) works without changing a single line of domain code.

### Structure

- `index.ts`: entry point. Mode and difficulty menus, readline lifecycle, fleet generation via `generateRandomLayout`. Run with `npm run cli` (uses `tsx`).
- `loop.ts`: game loops for both modes. Calls engine reducer factories directly as `(state, action) => state` functions. Derives `BoardState` snapshots for the renderer using the same derivation logic the hooks use.
- `renderer.ts`: pure string rendering. Board grids, shot results, game-over messages.
- `input.ts`: coordinate parser (`parseCoordinateInput`) and readline prompt loop. Exports a `LineReader` interface to avoid importing Node's `readline` types (which are unavailable under the `vite/client` type scope).

### AI delay omission

`AI_SHOT_DELAY_MS` is intentionally not used in the CLI. The delay is a UI affordance for the React frontend. It gives the player time to register the computer's turn visually. In a terminal, the shot result is printed synchronously and no delay is needed. The delay constant exists in `hooks/` rather than `engine/` precisely because it is a presentation concern, not a domain concern.

### What the CLI deliberately does not support

No colours or ANSI formatting. No game persistence or replay. No placement phase; both modes use `generateRandomLayout`. These are deliberate scope constraints. Adding any of them would be a CLI-layer change; none would require modifying engine, services, or types.

---

## Coordinate Representation

Three representations exist for different layers:

- `RawCoordinate`: `[col, row]` tuple, only in `data/` and `utils/`
- `Coordinate`: `{ col: number; row: number }`, structured object for internal use
- `CoordinateKey`: `${number},${number}` template literal, used as Map keys throughout

Having three is a deliberate choice, not an accident. The alternative, using a single representation everywhere, was considered and rejected. Tuples are compact for data definition but lack named fields. Objects are readable but not usable as Map keys. Template literal strings are usable as Map keys and carry type-level format information, but are not convenient for arithmetic. Each representation exists because it serves a specific purpose in its layer.

`toKey()` is the only legal production site for `CoordinateKey`. `fromKey()` is the only legal parse site. This is enforced by convention and code review. The constraint means coordinate format knowledge lives in exactly one place.

---

## Two Game Modes Without Shared State

Single-player and vs-computer share no state. Each mode has its own engine module, its own hook, and its own wiring component. `useVsComputerGame` uses a flat reducer state (`playerShots`, `computerShots`, `playerLastResult`, `computerLastResult`, `activeTurn`) and assembles `BoardState` objects in the return value for each player.

`Board` and `Cell` are shared rendering primitives. They know nothing about game mode. The `disabled` prop on `Board` prevents interaction: the player's own board passes `disabled` (always true, since you observe it but do not fire at it); the opponent's board passes `disabled={activeTurn !== "player" || winner !== null}`.

Adding a third mode would require a new engine module, a new hook, and a new wiring component. No existing code would need to change. The extensibility is not speculative; it is demonstrated by the fact that vs-computer was added this way.

---

## Testing Strategy

Prioritised by the cost of a regression.

**Domain (engine, services, utils, data):** thorough unit coverage. Pure functions, zero dependencies. Every rule, every guard condition, every edge case. The test suite here is the specification. A failure in this layer means a game rule is broken, which affects every consumer.

**Hooks:** `renderHook` with deterministic collaborators. `chooseRandomUnfiredCoordinate` is mocked to a fixed coordinate so AI-turn tests are predictable. `AI_SHOT_DELAY_MS` is exported and overridden to `0` in tests. `vi.useFakeTimers()` was rejected because it conflicts with `userEvent`'s internal timing, producing flaky tests that pass in isolation but fail in suite runs.

**Components:** rendering, interaction, hit/miss states, sunk messaging, game-over display. Cells targeted by `data-coord` attribute rather than `aria-label` regex to avoid false matches against row-10 cells (e.g. `/B1/` matches `B10`). Choosing a test strategy that avoids a known class of bugs beats fixing them one at a time.

---

## Deliberate Omissions

Each omission is a decision, not an oversight. The extension point is noted where relevant.

**Player ship placement in single-player mode.** Vs-computer mode has a `PlacementScreen` that lets the player manually position ships before battle begins. Single-player mode does not; ships are placed via `generateRandomLayout` on mount. The placement UI already exists and could be reused with minimal wiring. It was omitted to keep the single-player experience focused on the firing mechanic.

**Animations.** Not justified by the requirements. Animations on shot results could improve feedback, but they also risk being disruptive for users with `prefers-reduced-motion`. If added, they would be CSS transitions on cell state changes in the component layer.

**Global state library.** No Redux, Zustand, or Context provider. Each hook is self-contained: it owns its own reducer and derives its own view-ready data. There is no state that needs to be shared across components that are not in the same render tree. If a future feature genuinely required cross-cutting state (e.g. a shared settings panel affecting multiple game instances), Context would be the first option to evaluate.

**Smarter AI.** The computer fires randomly. A hunt-and-target or probability-map strategy would only touch `services/ai.ts`. The hook, reducer, engine, and every component would be unaffected. Swap one pure function, change zero interfaces.

**Multiplayer / networked play.** The engine layer is already consumer-agnostic. A networked mode would require a new consumer (WebSocket handler) dispatching actions to the same reducers. The main new concerns would be action validation (preventing illegal moves from a remote peer) and state synchronisation, both outside the engine.

---

## With More Time

**AI difficulty levels.** The current AI is stateless and random. A probability-map approach, tracking which cells are consistent with the remaining ships, would be a meaningful improvement. It would fit entirely within `services/ai.ts` as a new function with the same signature as the current one. The hook would select which AI function to use based on difficulty.

**Keyboard shortcut for firing.** Space fires the focused cell. A global shortcut (e.g. Enter from anywhere) would be a small accessibility improvement, implemented in `useBoardNavigation`.

**Persistent high score or replay.** The shots map is serialisable, so persistence would be a new concern at the app layer (`localStorage` or IndexedDB) without touching the domain.

**Visual board analysis after game over.** Revealing the full layout and highlighting the shot sequence would be a new display mode for `Board`, purely a rendering concern.

**Smarter default ship placement.** `generateRandomLayout` could prefer more spread-out placements to make games more interesting. Only the internal heuristic would change; the function's interface stays the same.

---

## Key Discussion Points

Questions a technical reviewer might ask about this codebase, with the reasoning behind each decision.

**Q: Why extract an engine layer instead of keeping reducer logic in the hooks?**
A: Two independent consumers need the same state transitions: React hooks via `useReducer` and the CLI runner via direct calls. Without the extraction, the CLI would either import React (wrong) or duplicate the logic (two sources of truth). One additional directory eliminates both problems.

**Q: Why `useReducer` rather than `useState`?**
A: Firing a shot updates the shots map and the last result atomically. Two `useState` calls would allow an intermediate render with inconsistent state. `useReducer` produces a single new state object per dispatch, so no consumer ever sees a partial update.

**Q: Why derive state with `useMemo` instead of persisting it in the reducer?**
A: Persisting derived values (e.g. a `sunkShipIds` set) creates a second source of truth that must stay consistent with the shots map. Deriving is consistent by construction, and the recomputation cost is negligible for a grid of at most 400 cells.

**Q: Why two separate hooks instead of one hook with a mode parameter?**
A: Different state shapes, different action types, different side effects. A combined hook would branch internally on every operation. The vs-computer hook was added without touching the single-player hook, which is the validation that two focused hooks scale better.

**Q: Why no Context or global state management?**
A: No state crosses component boundaries that are not already in the same render tree. If a future feature required cross-cutting state, Context would be evaluated first.

**Q: How would you add a smarter AI?**
A: Replace the body of the AI selection function in `services/ai.ts`. It takes the shots-received map and the board size, computes the unfired set internally, and returns one coordinate. The function signature stays the same, so no hook, reducer, engine, or component changes.

**Q: Why throw on invalid layout data instead of returning an error type?**
A: The layout is static data compiled into the bundle. An invalid layout is a programming mistake, not a user error or a network failure. Throwing fails loudly during development; an error return type would force every call site to handle a condition that cannot occur in production.

**Q: How confident are you that the layer boundaries hold?**
A: The CLI runner is the proof. It imports engine, services, utils, constants, and data, the same modules the React hooks import, and runs in a Node terminal with no React dependency. If the boundaries leaked, the CLI would not compile.
