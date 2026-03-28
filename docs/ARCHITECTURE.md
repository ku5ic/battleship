# Architecture

## Overview

This is a partial Battleship implementation built as a thin React UI shell around a pure domain layer. The central design principle is that Battleship rules are a solved, deterministic problem — they belong in plain TypeScript functions, not inside React components or hooks. React is responsible for rendering state and routing user intent. The domain layer is responsible for knowing what a hit, miss, sunk ship, and game over actually mean.

This separation is not abstract philosophy. It has a direct practical payoff: the engine functions are easy to unit test in isolation, the components are easy to test with simple props, and the hook that connects them is straightforward to reason about because neither side bleeds into the other.

---

## Folder Structure

```
src/
  app/                        # App entry point and root layout
  components/
    board/                    # Board and Cell — generic grid rendering
    game/                     # BattleshipGame — the wiring component
  features/
    battleship/
      components/             # Feature-specific presentational components
      constants/              # BOARD_SIZE, labels, display names
      data/                   # Raw config and parseLayout()
      hooks/                  # useBattleshipGame
      services/               # Pure engine: resolveShot, isShipSunk, isGameOver
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
- `GameState` — the read-only view exposed by the hook to the UI

Nothing uses `any`. Raw tuples are kept in the data layer only and do not escape into the rest of the app.

### `data/`

Two files. `config.ts` holds the raw ship layout JSON, typed as `RawGameConfig`. `layout.ts` exports `parseLayout()`, which converts that config into typed `Ship[]` and validates it eagerly:

- positions are within bounds
- position count matches declared ship size
- no two ships share a coordinate
- positions form a straight, contiguous horizontal or vertical line

`parseLayout` throws immediately on any violation. This is intentional — the layout is a static input and any error is a programming mistake, not a runtime condition to handle gracefully. The parsed result is exported from `data/index.ts` as the `SHIPS` constant, computed once at module load. Nothing else in the app calls `parseLayout` directly.

### `utils/coordinates.ts`

All coordinate manipulation lives here. `toKey`, `fromKey`, `rawToKey`, `isInBounds`, `deriveOrientation`, and `allBoardKeys` are all pure functions. The `toKey` function is the single point where `"col,row"` strings are produced — nothing else in the codebase constructs keys by hand. This is enforced by convention and reinforced by the `CoordinateKey` branded type.

### `services/engine.ts`

The domain logic. All functions are pure — they receive values, return values, and touch no external state.

**`buildPositionIndex(ships)`** — builds a `Map<CoordinateKey, Ship>` for O(1) coordinate-to-ship lookups. This is computed once in the hook, outside the reducer, so it is not reconstructed on every shot.

**`resolveShot(coordinate, shots, positionIndex)`** — the core of the game. Resolves a single shot attempt and returns a `ShotResult`. Priority order: already-fired → sunk → hit → miss. The caller (the reducer) is responsible for applying the result to state. The engine never mutates anything.

**`isShipSunk(ship, shots)`** — checks whether all coordinates of a ship are in the shots map. Pure predicate.

**`isGameOver(ships, sunkShipIds)`** — checks whether every ship has been sunk. Guards against an empty fleet (zero ships is not game over).

**`outcomeToStatus(outcome)`** — maps a `ShotOutcome` to a `CellStatus` for storage. `sunk` maps to `hit` because cell-level state does not track whether the broader ship went down; that information lives in `sunkShipIds`.

### `hooks/useBattleshipGame.ts`

The single hook that orchestrates game state. It uses `useReducer` rather than multiple `useState` calls. That choice is justified by the shape of the `FIRE` action: it has a guard (`already-fired` check) followed by a state update, and both the shots map and the last result need to update atomically. Sequential setters would require either a `useEffect` to sync them or accepting a frame where they are inconsistent. The reducer eliminates both problems.

Only two values are persisted in the reducer: `shots` (the `Map<CoordinateKey, CellStatus>`) and `lastResult` (the most recent `ShotResult`). Everything else — `sunkShipIds`, `isGameOver` — is derived from `shots` in the hook body using `useMemo`. This keeps the state minimal and avoids duplicated sources of truth.

`SHIPS` and `POSITION_INDEX` are computed once outside the hook at module scope. They are static for the lifetime of the session and there is no reason to recompute them on render or even on reset.

The public interface returns a `GameState` object plus `fireShot(col, row)` and `resetGame()`. Components receive these values as plain props; none of them are aware the hook exists.

### `components/game/BattleshipGame.tsx`

The single component that calls `useBattleshipGame`. Its only job is to wire the hook's output to the presentational layer. It translates `CoordinateKey` strings into `(col, row)` pairs before calling `fireShot`, and conditionally renders the "Play again" button. It does not implement any game rules.

### `components/board/Board.tsx`

Renders the 10×10 grid as a `role="grid"` with proper ARIA semantics: `aria-rowcount`, `aria-colcount`, `aria-readonly`, and labeled rows. Manages keyboard navigation via arrow keys and focus advancement after a shot. The focus logic is the one piece of non-trivial UI behavior here: after a cell is fired, focus advances to the next unfired cell in row-major order, deferred via `requestAnimationFrame` to let React flush the disabled state before the browser attempts to focus the element.

Column headers are `aria-hidden` because position is encoded in each cell's `aria-label`. Only the 10 data rows are visible to the accessibility tree.

### `components/board/Cell.tsx`

A single board cell rendered as a `<button>`. Disabled once fired (either hit or miss) or when the game is over. Builds its own accessible label from the coordinate and status, for example: `"C4, hit"` or `"A1, not fired. Press Space to fire"`. Visual state is communicated through both color and iconography (an X for hits, a dot for misses) so color is never the sole signal.

### `features/battleship/components/`

Three focused presentational components:

- **`ShotResultAnnouncer`** — a visually hidden `aria-live="polite"` region that announces each transient shot result (hit, miss, sunk, already-fired) to screen readers. Always rendered, always present in the DOM, so assistive technology has it registered before the first announcement.
- **`GameStatus`** — displays shot count during play and the victory message at game over. The game-over container uses `role="status"` so the transition is announced. Kept separate from `ShotResultAnnouncer` to prevent transient shot events from clobbering the stable end-of-game announcement.
- **`ShipStatusList`** — renders the fleet panel. Derives per-ship hit counts from the shots map rather than receiving them as props — the hits are a pure function of ship coordinates and the shots map, so there is no reason to compute or store this upstream.

---

## State Design

### What is persisted

```ts
interface State {
  shots: Map<CoordinateKey, CellStatus>;
  lastResult: ShotResult | null;
}
```

`shots` is the single source of truth for everything that has happened in the game. `lastResult` is persisted because the announcer needs to re-render with the latest result even if it happens to be the same outcome as before (e.g., two consecutive misses).

### What is derived

| Derived value      | Derived from                                     |
| ------------------ | ------------------------------------------------ |
| `sunkShipIds`      | `shots` + `SHIPS` via `isShipSunk`               |
| `isGameOver`       | `sunkShipIds` + `SHIPS` via `isGameOver`         |
| Per-ship hit count | `shots` + ship coordinates (in `ShipStatusList`) |
| Cell visual state  | `shots.get(coord)`                               |

Nothing is stored that can be derived. Nothing is derived twice from different sources.

### Why not Context or a global store

The game state is consumed by a single subtree rooted at `BattleshipGame`. There is no cross-tree sharing, no need for async middleware, and no requirement for time-travel debugging. A hook with a reducer is the right tool. Adding Redux or Zustand would introduce indirection and boilerplate with no architectural payoff at this scope.

---

## Coordinate System

Coordinates use 0-indexed `[col, row]` with `col` as the horizontal axis and `row` as the vertical axis, matching the raw layout data. The canonical identity for a coordinate throughout the app is a `CoordinateKey` string in `"col,row"` format. This format is produced exclusively by `toKey()` in `utils/coordinates.ts`.

Raw tuples (`RawCoordinate`) exist only at the boundary where the config is parsed. They are converted to `CoordinateKey` immediately and never referenced downstream.

Using string keys rather than array coordinates means `Map` and `Set` lookups behave correctly — JavaScript compares object references, not structural equality, so `[0, 0] !== [0, 0]` but `"0,0" === "0,0"`.

---

## Accessibility

WCAG 2.2 AA compliance was treated as a first-class requirement, not a retrofit.

- Board cells are `<button>` elements with `disabled` state. No `div` click handlers.
- Each cell's accessible name encodes its column letter, row number, and current status. Fireable cells append a brief activation hint.
- The grid uses `role="grid"` with `aria-rowcount`, `aria-colcount`, and `aria-readonly`. Keyboard navigation is fully implemented via arrow keys.
- `ShotResultAnnouncer` uses `aria-live="polite"` with `aria-atomic="true"` and is always present in the DOM so assistive technology registers it before the first event fires.
- `GameStatus` uses `role="status"` at game over to announce the victory state as a persistent update rather than a transient event.
- Hit and miss states are communicated through both color and distinct icons (X vs dot). Color is never the sole differentiator.
- Focus rings use a high-contrast yellow that is visible against the dark board regardless of cell state.
- Touch targets meet minimum size requirements at all breakpoints.

---

## Testing Strategy

Tests are prioritized by the cost of a regression.

**Domain logic** (engine functions, `parseLayout`, coordinate utilities) has thorough unit test coverage. These are pure functions with no dependencies — tests are fast, deterministic, and directly encode the Battleship rules. A failure here means a rule is broken.

**Component tests** cover rendering, user interaction, and accessibility contracts. The focus is on behavior visible to users and assistive technology, not implementation details. `data-coord` attributes are used for unambiguous cell targeting rather than aria-label regexes where label wording might change.

**Integration tests** (`BattleshipGame.test.tsx`) exercise the full game flow using known ship coordinates from the config. They verify that a full playthrough reaches game-over state and that the reset action restores the initial state.

---

## Deliberate Omissions

**Player ship placement, opponent turns, persistence, multiplayer.** These are deliberately out of scope. The architecture does not block adding them: the engine layer could accept a second fleet, the state shape could be extended to include player ships, and `parseLayout` already validates any layout configuration.

**Animations.** Not justified by the requirements and would add complexity without improving the core experience.

**Global state library.** Not needed at this scope. The state lives where it is used.

**Dynamic ship layout.** The config is static. It is parsed once, validated, and treated as read-only for the duration of a session. If the layout were server-provided, `parseLayout` and the hook initialization would be the only two places that need to change.
