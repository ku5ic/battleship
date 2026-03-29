# Architecture

## Overview

This is a Battleship implementation built as a thin React UI shell around a pure domain layer. The central design principle is that Battleship rules are a solved, deterministic problem — they belong in plain TypeScript functions, not inside React components or hooks. React is responsible for rendering state and routing user intent. The domain layer is responsible for knowing what a hit, miss, sunk ship, and game over actually mean.

This separation is not abstract philosophy. It has a direct practical payoff: the engine functions are easy to unit test in isolation, the components are easy to test with simple props, and the hooks that connect them are straightforward to reason about because neither side bleeds into the other.

The codebase supports two game modes — single-player and vs-computer — without any changes to the domain layer. The engine is board-local and pure. Adding a second board required only a new hook and a new wiring component.

---

## Folder Structure

```
src/
  app/                        # App entry point, mode toggle, difficulty selector
  components/
    board/                    # Board and Cell — generic grid rendering (shared)
    game/                     # BattleshipGame, BattleshipMultiplayerGame
  features/
    battleship/
      components/             # Feature-specific presentational components
      constants/              # BOARD_SIZE, DIFFICULTY_CONFIG, labels, display names
      data/                   # Raw config and parseLayout()
      hooks/                  # useBattleshipGame, useBattleshipSessionGame
      services/               # Pure engine: resolveShot, applyShotToBoard, AI helper
      types/                  # All domain types (includes Difficulty, DifficultyConfig)
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
- `Difficulty` — `"easy" | "moderate" | "hard"`
- `DifficultyConfig` — `{ boardSize: number; columnLabels: readonly string[]; label: string }`

Nothing uses `any`. Raw tuples are kept in the data layer only and do not escape into the rest of the app.

### `constants/`

Exports `BOARD_SIZE` (10, used as the default in coordinate utilities), `COLUMN_LABELS` (A–J, the default label set), `DIFFICULTY_CONFIG` (the canonical map from `Difficulty` to `DifficultyConfig`), `SHIP_DISPLAY_NAMES`, and `SHOT_OUTCOME_LABELS`.

`DIFFICULTY_CONFIG` is typed with `satisfies Record<Difficulty, DifficultyConfig>` to preserve literal inference. Both hooks read `boardSize` and `columnLabels` from this map.

### `data/`

Two files. `config.ts` holds the raw ship layout JSON, typed as `RawGameConfig`. `layout.ts` exports `parseLayout(config, boardSize)`, which converts that config into typed `Ship[]` and validates it eagerly:

- positions are within bounds (checked against the given `boardSize`)
- position count matches declared ship size
- no two ships share a coordinate
- positions form a straight, contiguous horizontal or vertical line

`parseLayout` throws immediately on any violation. This is intentional — the layout is a static input and any error is a programming mistake, not a runtime condition to handle gracefully.

`data/index.ts` exports a `SHIPS` constant parsed at board size 10. Neither hook uses `SHIPS` — both call `generateRandomLayout` directly with the active board size derived from `DIFFICULTY_CONFIG`. `SHIPS` is retained for test fixtures and any future static-layout consumer.

### `utils/coordinates.ts`

All coordinate manipulation lives here. `toKey`, `fromKey`, `rawToKey`, `isInBounds`, `deriveOrientation`, and `allBoardKeys` are all pure functions. The `toKey` function is the single point where `"col,row"` strings are produced — nothing else in the codebase constructs keys by hand.

`isInBounds` and `allBoardKeys` accept a `boardSize` parameter (defaulting to `BOARD_SIZE`) to support variable grid sizes.

### `services/engine.ts`

The core domain logic. All functions are pure.

**`buildPositionIndex(ships)`** — builds a `Map<CoordinateKey, Ship>` for O(1) coordinate-to-ship lookups. Computed inside each hook via `useMemo` because the ship set depends on the active board size.

**`resolveShot(coordinate, shots, positionIndex)`** — resolves a single shot attempt and returns a `ShotResult`. Priority order: already-fired → sunk → hit → miss. Never mutates anything.

**`applyShotToBoard(coordinate, board, positionIndex)`** — the board-level coordinator. Calls `resolveShot`, applies the result to produce a new `BoardState`, updates `sunkShipIds`, and recomputes `isGameOver`. Returns `{ board: nextBoard, result }`. Pure — input board is never mutated. Used by the session hook reducer; the single-player hook uses `resolveShot` directly.

**`isShipSunk(ship, shots)`** — pure predicate.

**`isGameOver(ships, sunkShipIds)`** — pure predicate. Guards against an empty fleet.

**`outcomeToStatus(outcome)`** — maps `ShotOutcome` to `CellStatus`.

### `services/ai.ts`

**`services/placement.ts`** — `generateRandomLayout(config, boardSize): Ship[]`. Produces a valid random fleet layout largest-first. Pure function, no React dependency. The single site where procedural placement logic lives.

### `services/ai.ts`

A single pure function: `chooseRandomUnfiredCoordinate(shotsReceived, boardSize)`. Filters `allBoardKeys(boardSize)` against the shots map and returns a random unfired coordinate, or `null` if every cell has been fired at. It has no side effects and no timing logic — those concerns belong in the hook.

### `hooks/useBattleshipGame.ts`

The single-player hook. Accepts a `difficulty` parameter (defaults to `"easy"`). Reads `boardSize` and `columnLabels` from `DIFFICULTY_CONFIG[difficulty]`. Ships and the position index are derived inside the hook via `useMemo` from `parseLayout(RAW_GAME_CONFIG, boardSize)` — they depend on board size, so they cannot be module-scope constants.

Uses `useReducer` with `FIRE` and `RESET` actions. Only two values are persisted: `shots` and `lastResult`. `sunkShipIds` and `isGameOver` are derived via `useMemo`.

### `hooks/useBattleshipSessionGame.ts`

The session hook for vs-computer mode. Accepts a `difficulty` parameter (defaults to `"easy"`). Ships and both position indexes are derived inside the hook via `useMemo` from `parseLayout(RAW_GAME_CONFIG, boardSize)`. Both players share the same fleet layout; the `useMemo` is the fork point when distinct layouts per player are introduced.

Uses `useReducer` with `PLAYER_FIRE`, `COMPUTER_FIRE`, and `RESET` actions. The reducer is strictly synchronous — it receives a coordinate, calls `applyShotToBoard`, and derives the next `activeTurn`, `winner`, and `isAiThinking` from the result. No async logic enters the reducer.

AI timing is handled entirely in a `useEffect` that watches `activeTurn`, `winner`, and the player's shot map. When it is the computer's turn, it calls `chooseRandomUnfiredCoordinate(shots, boardSize)`, schedules a `setTimeout` with `AI_SHOT_DELAY_MS`, and dispatches `COMPUTER_FIRE` when it fires. The effect cleanup cancels the timeout — this correctly handles reset mid-delay and component unmount.

The public interface exposes `board`, `activeTurn`, `winner`, `isAiThinking`, `boardSize`, `columnLabels`, `playerLastResult`, `computerLastResult`, `playerShipHitCounts`, `computerShipHitCounts`, `playerFireShot`, and `reset`. Components receive these as plain props.

### `components/game/BattleshipGame.tsx`

Wires `useBattleshipGame` to the presentational layer. Accepts a `difficulty` prop and passes it to the hook. Single board, single `ShotResultAnnouncer`, single `GameStatus`. The only component that calls `useBattleshipGame`.

### `components/game/BattleshipMultiplayerGame.tsx`

Wires `useBattleshipSessionGame` to the presentational layer. Accepts a `difficulty` prop and passes it to the hook. Renders two `Board` instances — the player's board in read-only mode, the opponent's board in interactive mode (locked when it is not the player's turn). Two `ShotResultAnnouncer` instances — one per board — so player and computer shot events do not clobber each other. Uses `GameStatusMultiplayer` for session-level turn and outcome messaging.

Layout is difficulty-responsive: boards sit side-by-side at `lg` breakpoints for Easy difficulty only. Moderate and Hard boards always stack vertically because the wider grids cannot share a row without sub-pixel cells. Uses `cn()` for conditional class composition.

### `app/App.tsx`

Renders a mode toggle (Single player / vs Computer) using `aria-pressed` buttons and a difficulty selector (Easy / Moderate / Hard) using `aria-pressed` buttons inside a `role="group"` with `aria-label="Difficulty"`. Switching mode or difficulty unmounts the current game and mounts the other via a `key` prop (`${mode}-${difficulty}`), resetting state without any explicit reset call.

### `components/board/Board.tsx`

Renders the game board as a `role="grid"` with dynamic column count. Accepts `boardSize` and `columnLabels` as props. Uses CSS grid with `gridTemplateColumns` set via inline style — Tailwind cannot generate grid-template-columns for arbitrary runtime values, so inline style is the justified exception. The first column (1.5rem) holds the row number label; the remaining columns are equal-width cells.

Shared between both game modes. Accepts an optional `isReadOnly` prop — when true, all cells receive `disabled={true}` and `aria-readonly` is set on the grid. Used for the player's own board in vs-computer mode where cells show incoming shots but are not fireable.

Manages keyboard navigation via arrow keys and roving tabindex. Focus advances to the next unfired cell after a shot, deferred via `requestAnimationFrame` to avoid a race with the disabled state flush.

### `components/board/Cell.tsx`

A single board cell rendered as a `<button>`. Accepts a `columnLabel` prop and builds its own accessible label from it directly — no import of `COLUMN_LABELS`. Disabled when fired or when the `disabled` prop is passed. Accessible label examples: `"C4, hit"` or `"A1, not fired. Press Space to fire"`. Visual state is communicated through both color and iconography.

Fireable cells display a coordinate tooltip on hover and focus. The tooltip is `aria-hidden` (the accessible name already encodes the position) and uses `group-hover`/`group-focus-visible` for visibility. Cells use `aspect-square` to stay square at all breakpoints; touch targets are met by `scale-125` on hover/focus rather than minimum height.

### `features/battleship/components/`

Five focused presentational components:

- **`ShotResultAnnouncer`** — visually hidden `aria-live="polite"` region for transient shot events
- **`GameStatus`** — single-player game progress and victory message
- **`GameStatusMultiplayer`** — session-level turn state and outcome for vs-computer mode. Renders `"Your turn — select a cell to fire."`, `"Computer is thinking…"`, `"You win! All enemy ships sunk."`, or `"Defeated. All your ships were sunk."` depending on `activeTurn`, `isAiThinking`, and `winner`
- **`ShipStatusList`** — renders the fleet panel, deriving hit counts from the shots map
- **`ShipStatusItem`** — renders one ship row with pip indicators and a sunk state

---

## Difficulty System

The `Difficulty` type (`"easy" | "moderate" | "hard"`) drives board size through a single configuration constant:

```ts
DIFFICULTY_CONFIG: Record<Difficulty, DifficultyConfig>
```

Each entry defines `boardSize`, `columnLabels`, and a display `label`. The flow:

1. `App.tsx` holds `difficulty` in state and passes it as a prop to the active game component.
2. The game component passes `difficulty` to its hook.
3. The hook reads `boardSize` and `columnLabels` from `DIFFICULTY_CONFIG[difficulty]`.
4. The hook calls `parseLayout(RAW_GAME_CONFIG, boardSize)` inside `useMemo` to produce ships and position indexes. These are hook-scope values, not module-scope constants, because they depend on the active board size.
5. The hook passes `boardSize` and `columnLabels` through its return value.
6. The wiring component passes them to `Board` as props.

**Why key-based remount instead of a reset action:** Changing difficulty requires new ships, new position indexes, and a fresh state. A reset action would need to handle all of these atomically. The `key` prop approach (`key={${mode}-${difficulty}}`) is simpler — React unmounts the old tree and mounts a fresh one, so each hook instance runs with a single stable board size for its entire lifetime.

**Why position indexes moved from module scope to hook scope:** When board size was fixed at 10, ships and position indexes could be computed once at module load. With variable board sizes, they depend on runtime state (`difficulty`), so they must be computed inside the hook. `useMemo([boardSize])` ensures they are stable within a mount and recomputed only when difficulty changes (which triggers a remount anyway).

---

## Responsive Layout

### Board grid

`Board` uses CSS grid with a dynamic `gridTemplateColumns` computed at render time:

```ts
`1.5rem repeat(${boardSize}, 1fr)`
```

This is set via inline style — the one justified exception to the no-inline-style rule. Tailwind's `grid-cols-*` utilities only support static values; a runtime board size requires a computed template.

Cells use `aspect-square` to maintain square proportions at all breakpoints. Touch targets are met by `scale-125` on hover/focus rather than by minimum height — this avoids overflow on dense grids (15×15, 20×20) while still meeting touch target requirements.

### Multiplayer layout

In vs-computer mode, the two boards are laid out with flexbox:

- **Default (all difficulties):** `flex-col items-center` — boards stack vertically, centered.
- **Easy at `lg`:** `lg:flex-row lg:justify-center lg:items-start` — boards sit side-by-side with `flex-1` so they share width equally.
- **Moderate and Hard:** Always stacked. The wider grids cannot share a row without sub-pixel cells and unreadable labels.

The difficulty gate is applied via `cn()` conditional class composition, not separate component trees.

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

| Derived value      | Derived from                          |
| ------------------ | ------------------------------------- |
| `sunkShipIds`      | `shots` + ships (from `useMemo`)      |
| `isGameOver`       | `sunkShipIds` + ships (from `useMemo`)|
| Per-ship hit count | `shots` + ship coordinates            |
| Cell visual state  | `shots.get(coord)`                    |

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
- Each cell's accessible name encodes column letter, row number, and current status. The column label is passed to `Cell` as a prop, so accessible names are correct at all board sizes. Fireable cells append a brief activation hint.
- Fireable cells display a coordinate tooltip on hover and focus. The tooltip is `aria-hidden` — the accessible name already encodes the position.
- The grid uses `role="grid"` with `aria-rowcount`, `aria-colcount`, and `aria-readonly`. Keyboard navigation is fully implemented via arrow keys and roving tabindex.
- Two `ShotResultAnnouncer` instances in vs-computer mode — one per board — prevent concurrent shot events from clobbering each other in the accessibility tree.
- `GameStatusMultiplayer` uses `role="status"` to announce stable session-state transitions (turn changes, victory, defeat) as a persistent update rather than transient events.
- The difficulty selector uses `aria-pressed` toggle buttons inside a `role="group"` with `aria-label="Difficulty"`.
- Hit and miss states are communicated through both color and distinct icons. Color is never the sole differentiator.
- Focus rings use high-contrast yellow visible against the dark board at any cell state.
- Touch targets meet minimum size requirements at all breakpoints — cells use `aspect-square` with `scale-125` on hover/focus.

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

Ship layouts are randomized on every mount via `generateRandomLayout` in `services/placement.ts`. The function reads `config.shipTypes` for fleet composition and ignores `config.layout`. Difficulty controls board size only; fleet composition is fixed by the config. The session hook calls `generateRandomLayout` independently for each player inside a single `useMemo([boardSize])` — `playerShips` and `computerShips` are always distinct.

**Distinct AI strategy.** The computer fires randomly. A smarter AI (probability targeting, hunt mode) would only touch `services/ai.ts` — the hook, reducer, and engine are unaffected.
