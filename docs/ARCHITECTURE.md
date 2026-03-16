# Architecture

## Overview

This is a Battleship implementation built as a thin React UI shell around a pure domain layer. The central design principle is that Battleship rules are a solved, deterministic problem — they belong in plain TypeScript functions, not inside React components or hooks. React is responsible for rendering state and routing user intent. The domain layer is responsible for knowing what a hit, miss, sunk ship, and game over actually mean.

This separation is not abstract philosophy. It has a direct practical payoff: the engine functions are easy to unit test in isolation, the components are easy to test with simple props, and the hooks that connect them are straightforward to reason about because neither side bleeds into the other.

The codebase supports two game modes — single-player and vs-computer — without any changes to the domain layer. The engine is board-local and pure. Adding a second board required only a new hook and a new wiring component.

---

## Folder Structure

```
src/
  app/                        # App entry point and mode toggle
  components/
    board/                    # Board and Cell — generic grid rendering (shared)
    game/                     # BattleshipGame, BattleshipMultiplayerGame
  features/
    battleship/
      components/             # Feature-specific presentational components
      constants/              # BOARD_SIZE, labels, display names
      data/                   # Raw config and parseLayout()
      hooks/                  # useBattleshipGame, useBattleshipSessionGame
      services/               # Pure engine: resolveShot, applyShotToBoard, AI helper
      types/                  # All domain types
      utils/                  # Coordinate utilities
  lib/                        # Shared utilities (cn)
  test/                       # Mirrors src/ structure
```

The `battleship` feature folder owns everything domain-specific. The `components/` folder at the top level holds components that are domain-aware by props but not by logic — `Board` and `Cell` know how to render a grid, but they know nothing about ships or shot resolution.

---

## Layer Responsibilities

### `types/`

Defines the complete domain vocabulary. Every meaningful concept has an explicit type:

- `ShipType` — the five named ships as a string union
- `CoordinateKey` — a template literal type (`${number},${number}`) that enforces the canonical string key format at the type level
- `RawCoordinate` — a labeled tuple `[col, row]` used only in the raw config layer
- `Ship` — the parsed representation of a ship, with `id`, `size`, `coordinates`, and `orientation`
- `CellStatus` — what a player can observe about a cell: `untouched`, `hit`, or `miss`
- `ShotOutcome` — the full result of a shot attempt, including `already-fired` and `sunk`
- `ShotResult` — what the engine returns: coordinate, outcome, and optional `sunkShipId`
- `GameState` — the read-only view of a single board exposed by the hook to the UI
- `BoardState` — a semantic alias for `GameState`. Structurally identical; the alias signals "this is one player's board" without duplicating the definition
- `PlayerId` — `"player" | "computer"`, used to identify board ownership and turn state
- `SessionBoards` — the two-board structure `{ player: BoardState; computer: BoardState }`
- `SessionState` — the top-level shape owned by the session hook

Nothing uses `any`. Raw tuples are kept in the data layer only and do not escape into the rest of the app.

### `data/`

Two files. `config.ts` holds the raw JSON provided by the assignment, typed as `RawGameConfig`. `layout.ts` exports `parseLayout()`, which converts that config into typed `Ship[]` and validates it eagerly:

- positions are within bounds
- position count matches declared ship size
- no two ships share a coordinate
- positions form a straight, contiguous horizontal or vertical line

`parseLayout` throws immediately on any violation. This is intentional — the layout is a static input and any error is a programming mistake, not a runtime condition to handle gracefully. The parsed result is exported from `data/index.ts` as the `SHIPS` constant, computed once at module load.

Both boards in the session hook share the same fleet for now. The separation between `PLAYER_SHIPS` and `COMPUTER_SHIPS` constants at module scope makes this easy to change if distinct layouts are ever needed.

### `utils/coordinates.ts`

All coordinate manipulation lives here. `toKey`, `fromKey`, `rawToKey`, `isInBounds`, `deriveOrientation`, and `allBoardKeys` are all pure functions. The `toKey` function is the single point where `"col,row"` strings are produced — nothing else in the codebase constructs keys by hand.

### `services/engine.ts`

The core domain logic. All functions are pure.

**`buildPositionIndex(ships)`** — builds a `Map<CoordinateKey, Ship>` for O(1) coordinate-to-ship lookups. Computed once per board at module scope.

**`resolveShot(coordinate, shots, positionIndex)`** — resolves a single shot attempt and returns a `ShotResult`. Priority order: already-fired → sunk → hit → miss. Never mutates anything.

**`applyShotToBoard(coordinate, board, positionIndex)`** — the board-level coordinator. Calls `resolveShot`, applies the result to produce a new `BoardState`, updates `sunkShipIds`, and recomputes `isGameOver`. Returns `{ board: nextBoard, result }`. Pure — input board is never mutated. Used by the session hook reducer; the single-player hook uses `resolveShot` directly.

**`isShipSunk(ship, shots)`** — pure predicate.

**`isGameOver(ships, sunkShipIds)`** — pure predicate. Guards against an empty fleet.

**`outcomeToStatus(outcome)`** — maps `ShotOutcome` to `CellStatus`.

### `services/ai.ts`

A single pure function: `chooseRandomUnfiredCoordinate(shotsReceived)`. Filters all 100 board keys against the shots map and returns a random unfired coordinate, or `null` if every cell has been fired at. It has no side effects and no timing logic — those concerns belong in the hook.

### `hooks/useBattleshipGame.ts`

The single-player hook. Uses `useReducer` with `FIRE` and `RESET` actions. Only two values are persisted: `shots` and `lastResult`. `sunkShipIds` and `isGameOver` are derived via `useMemo`. `SHIPS` and `POSITION_INDEX` are computed once at module scope.

### `hooks/useBattleshipSessionGame.ts`

The session hook for vs-computer mode. Uses `useReducer` with `PLAYER_FIRE`, `COMPUTER_FIRE`, and `RESET` actions. The reducer is strictly synchronous — it receives a coordinate, calls `applyShotToBoard`, and derives the next `activeTurn`, `winner`, and `isAiThinking` from the result. No async logic enters the reducer.

AI timing is handled entirely in a `useEffect` that watches `activeTurn`, `winner`, and the player's shot map. When it is the computer's turn, it calls `chooseRandomUnfiredCoordinate`, schedules a `setTimeout` with `AI_SHOT_DELAY_MS`, and dispatches `COMPUTER_FIRE` when it fires. The effect cleanup cancels the timeout — this correctly handles reset mid-delay and component unmount.

`PLAYER_POSITION_INDEX` and `COMPUTER_POSITION_INDEX` are both built from the same `SHIPS` constant at module scope. They are separate constants to make the intent explicit and to keep the hook ready for distinct layouts.

The public interface exposes `board`, `activeTurn`, `winner`, `isAiThinking`, `playerLastResult`, `computerLastResult`, `playerFireShot`, and `reset`. Components receive these as plain props.

### `components/game/BattleshipGame.tsx`

Wires `useBattleshipGame` to the presentational layer. Single board, single `ShotResultAnnouncer`, single `GameStatus`. The only component that calls `useBattleshipGame`.

### `components/game/BattleshipMultiplayerGame.tsx`

Wires `useBattleshipSessionGame` to the presentational layer. Renders two `Board` instances — the player's board in read-only mode, the opponent's board in interactive mode (locked when it is not the player's turn). Two `ShotResultAnnouncer` instances — one per board — so player and computer shot events do not clobber each other. Uses `GameStatusMultiplayer` for session-level turn and outcome messaging.

### `app/App.tsx`

Renders a mode toggle (Single player / vs Computer) using `aria-pressed` buttons. Switching mode unmounts the current game and mounts the other, resetting state without any explicit reset call.

### `components/board/Board.tsx`

Renders the 10×10 grid as a `role="grid"`. Shared between both game modes. Accepts an optional `isReadOnly` prop — when true, all cells receive `disabled={true}` and `aria-readonly` is set on the grid. Used for the player's own board in vs-computer mode where cells show incoming shots but are not fireable.

Manages keyboard navigation via arrow keys and roving tabindex. Focus advances to the next unfired cell after a shot, deferred via `requestAnimationFrame` to avoid a race with the disabled state flush.

### `components/board/Cell.tsx`

A single board cell rendered as a `<button>`. Disabled when fired or when the `disabled` prop is passed. Builds its own accessible label: e.g. `"C4, hit"` or `"A1, not fired. Press Space to fire"`. Visual state is communicated through both color and iconography.

### `features/battleship/components/`

Five focused presentational components:

- **`ShotResultAnnouncer`** — visually hidden `aria-live="polite"` region for transient shot events
- **`GameStatus`** — single-player game progress and victory message
- **`GameStatusMultiplayer`** — session-level turn state and outcome for vs-computer mode. Renders `"Your turn — select a cell to fire."`, `"Computer is thinking…"`, `"You win! All enemy ships sunk."`, or `"Defeated. All your ships were sunk."` depending on `activeTurn`, `isAiThinking`, and `winner`
- **`ShipStatusList`** — renders the fleet panel, deriving hit counts from the shots map
- **`ShipStatusItem`** — renders one ship row with pip indicators and a sunk state

---

## State Design

### Single-player persisted state

```ts
interface State {
  shots: Map<CoordinateKey, CellStatus>;
  lastResult: ShotResult | null;
}
```

### Session persisted state

```ts
interface SessionState {
  board: {
    player: BoardState;
    computer: BoardState;
  };
  activeTurn: PlayerId;
  winner: PlayerId | null;
  isAiThinking: boolean;
}
```

`BoardState` is an alias for `GameState`. Each board carries its own `shots`, `sunkShipIds`, `isGameOver`, and `lastResult`. Nothing is computed outside of what the reducer needs — `isAiThinking` is set directly in the reducer because it is a direct consequence of the shot result and needs to be atomic with the turn switch.

### What is derived (single-player)

| Derived value      | Derived from               |
| ------------------ | -------------------------- |
| `sunkShipIds`      | `shots` + `SHIPS`          |
| `isGameOver`       | `sunkShipIds` + `SHIPS`    |
| Per-ship hit count | `shots` + ship coordinates |
| Cell visual state  | `shots.get(coord)`         |

### Why the reducer stays synchronous

The `COMPUTER_FIRE` action carries a pre-resolved coordinate. The `useEffect` is responsible for choosing it and for the timing delay — the reducer only needs to apply the shot. This keeps the reducer a pure state machine and makes it easy to test in isolation from timing concerns.

### Why not Context or a global store

Both game modes are consumed by a single component subtree. There is no cross-tree sharing, no async middleware requirement, and no time-travel debugging need. A hook with a reducer is the right tool at this scope.

---

## Coordinate System

Coordinates use 0-indexed `[col, row]` with `col` as the horizontal axis and `row` as the vertical axis, matching the raw layout data. The canonical identity is a `CoordinateKey` string in `"col,row"` format, produced exclusively by `toKey()`.

Raw tuples (`RawCoordinate`) exist only at the config boundary and are converted immediately. String keys make `Map` and `Set` lookups correct by default — `"0,0" === "0,0"` where `[0, 0] !== [0, 0]`.

---

## Accessibility

WCAG 2.2 AA compliance was treated as a first-class requirement, not a retrofit.

- Board cells are `<button>` elements with `disabled` state. No div click handlers.
- Each cell's accessible name encodes column letter, row number, and current status. Fireable cells append a brief activation hint.
- The grid uses `role="grid"` with `aria-rowcount`, `aria-colcount`, and `aria-readonly`. Keyboard navigation is fully implemented via arrow keys and roving tabindex.
- Two `ShotResultAnnouncer` instances in vs-computer mode — one per board — prevent concurrent shot events from clobbering each other in the accessibility tree.
- `GameStatusMultiplayer` uses `role="status"` to announce stable session-state transitions (turn changes, victory, defeat) as a persistent update rather than transient events.
- Hit and miss states are communicated through both color and distinct icons. Color is never the sole differentiator.
- Focus rings use high-contrast yellow visible against the dark board at any cell state.
- Touch targets meet minimum size requirements at all breakpoints.

---

## Testing Strategy

Tests are prioritized by the cost of a regression.

**Domain logic** — thorough unit test coverage. Pure functions, no dependencies. A failure here means a rule is broken.

**Hook tests** — `useBattleshipGame` and `useBattleshipSessionGame` tested with `renderHook`. The session hook tests mock `chooseRandomUnfiredCoordinate` to a deterministic coordinate and export `AI_SHOT_DELAY_MS` so tests can override it to `0`, eliminating fake-timer complexity entirely.

**Component tests** — cover rendering, user interaction, and accessibility contracts. `data-coord` attributes used for unambiguous cell targeting.

**Integration tests** — `BattleshipGame.test.tsx` for single-player flow. `BattleshipMultiplayerGame.test.tsx` for the full two-board session: player turns, AI turns, sunk ships, win condition, and reset including cancel-on-reset for the pending AI timeout.

---

## Deliberate Omissions

**Player ship placement.** Out of scope. The architecture supports it: `parseLayout` accepts any valid config, and each board already holds its own fleet.

**Animations.** Not justified by the requirements and potentially disruptive for users with motion sensitivity preferences.

**Global state library.** Not needed at this scope. Both hooks are self-contained.

**Dynamic ship layout.** The config is static, parsed once, and treated as read-only. If layouts were server-provided, `parseLayout` and the module-scope initialization would be the only two places to change.

**Distinct AI strategy.** The computer fires randomly. A smarter AI (probability targeting, hunt mode) would only touch `services/ai.ts` — the hook, reducer, and engine are unaffected.
