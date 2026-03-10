# Battleship

A partial Battleship implementation built as a take-home assignment for a Senior Frontend Engineer role. The game renders a 10×10 grid, consumes a static ship layout, and lets a player fire shots until all ships are sunk.

---

## Setup

**Requirements:** Node 18+

```bash
npm install
npm run dev
```

The dev server starts at `http://localhost:5173`.

---

## Scripts

| Script                  | Description                                      |
| ----------------------- | ------------------------------------------------ |
| `npm run dev`           | Start Vite dev server with HMR                   |
| `npm run build`         | Type-check and produce a production build        |
| `npm run preview`       | Serve the production build locally               |
| `npm run test`          | Run the full test suite once                     |
| `npm run test:watch`    | Run tests in watch mode                          |
| `npm run test:coverage` | Run tests and emit a coverage report             |
| `npm run lint`          | Run ESLint across `src/` (zero warnings allowed) |
| `npm run format`        | Format `src/` with Prettier                      |
| `npm run format:check`  | Check formatting without writing                 |
| `npm run typecheck`     | Type-check without emitting                      |

The CI check is: `typecheck` → `lint` → `format:check` → `test`. All four must pass cleanly.

---

## Overview

The game rules are treated as a pure domain problem. React is a thin rendering shell around them. This means:

- **Components** receive props, render UI, and emit callbacks. They contain no game logic.
- **The hook** (`useBattleshipGame`) orchestrates state and exposes a typed `GameState` to the wiring component. It delegates all rule evaluation to the service layer.
- **Service functions** (`resolveShot`, `isShipSunk`, `isGameOver`) are pure TypeScript with no React dependency. They are the authoritative source for what a hit, miss, sunk ship, and game over mean.
- **The data layer** parses and validates the raw ship layout once at startup. The parsed result is static for the life of the session.

The practical payoff: the engine is testable in isolation, components are testable with simple props, and the hook is easy to reason about because neither side bleeds into the other.

---

## Architecture

Full reasoning is in [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md). A brief summary:

### Folder structure

```
src/
  app/                        # App entry point and root layout
  components/
    board/                    # Board and Cell — grid rendering
    game/                     # BattleshipGame — wires hook to UI
  features/
    battleship/
      components/             # Presentational feature components
      constants/              # BOARD_SIZE, column labels, ship display names
      data/                   # Raw config and parseLayout()
      hooks/                  # useBattleshipGame
      services/               # Pure engine functions
      types/                  # All domain types
      utils/                  # Coordinate utilities
  lib/                        # Shared utilities (cn)
  test/                       # Mirrors src/ structure
```

### State design

Only two values are persisted: `shots` (a `Map<CoordinateKey, CellStatus>`) and `lastResult` (the most recent `ShotResult`). Everything else — `sunkShipIds`, `isGameOver` — is derived from `shots` using `useMemo`. The reducer handles the `FIRE` and `RESET` actions. `SHIPS` and `POSITION_INDEX` are parsed once outside the hook at module scope; they do not change during a session.

### Coordinate system

Coordinates are 0-indexed `[col, row]` matching the raw layout data. The canonical identity throughout the app is a `CoordinateKey` template literal type (`${number},${number}`). Raw tuples exist only at the config boundary and are converted immediately. This makes `Map` and `Set` lookups correct by default — string equality behaves as expected where object reference equality does not.

---

## Testing

Tests are in `src/test/`, mirroring the `src/` structure. Coverage priorities:

**Domain logic (unit tests)** — the highest-value tests. Pure functions with no dependencies: coordinate normalization, layout validation (bounds, overlap, contiguity), hit/miss/sunk/game-over detection, and repeated-shot handling.

**Component tests** — cover rendering, user interaction, and accessibility contracts. Cell queries use `{ name: /pattern/ }` matchers that verify actual accessible label content, not just element presence.

**Integration tests** (`BattleshipGame.test.tsx`) — exercise a full game flow using known ship coordinates from the config. Verify that a complete playthrough reaches game-over state and that reset restores the initial state.

Run with:

```bash
npm run test
npm run test:coverage
```

---

## Accessibility

WCAG 2.2 AA compliance was a first-class requirement throughout, not a retrofit.

- Board cells are `<button>` elements. No div click handlers.
- Each cell's accessible name encodes its column letter, row number, and current state — for example, `"C4, hit"` or `"A1, not fired. Press Space to fire"`.
- The grid uses `role="grid"` with `aria-rowcount`, `aria-colcount`, and `aria-readonly`. Arrow key navigation is fully implemented with roving tabindex.
- `ShotResultAnnouncer` is a visually hidden `aria-live="polite"` region, always present in the DOM. A `key` prop forces remount on each result so repeated identical outcomes (two consecutive misses) are re-announced reliably.
- `GameStatus` uses `role="status"` at game over — a stable state change, not a transient event. The two mechanisms (`aria-live` for shots, `role="status"` for game over) are kept separate to prevent announcements from clobbering each other.
- Hit and miss states are communicated through both color and iconography (× for hits, dot for misses). Color is never the sole differentiator.
- Focus rings use high-contrast yellow visible against the dark board at any cell state.
- Touch targets meet minimum size requirements at all breakpoints from 320px width upward.

---

## Responsiveness

The board is wrapped in a horizontal scroll container. On narrow screens it scrolls rather than shrinking cells below usable size. The layout has been tested at 320px (iPhone 5) up to 1440px desktop.

---

## Docs

| File                                                                 | Contents                                                                                                          |
| -------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------- |
| [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md)                       | Layer responsibilities, state design, coordinate system, accessibility and testing strategy, deliberate omissions |
| [`docs/AI_USAGE.md`](docs/AI_USAGE.md)                               | Where AI assistance was used, what was changed, what was rejected, and the author's responsibility statement      |
| [`docs/AI_PROJECT_INSTRUCTIONS.md`](docs/AI_PROJECT_INSTRUCTIONS.md) | Original engineering brief used to guide the implementation                                                       |

---

## Out of scope

Player ship placement, opponent turns, persistence, multiplayer, and animations are explicitly excluded per the assignment. The architecture does not block adding them: the engine layer could accept a second fleet, the state shape could be extended, and `parseLayout` already validates any layout configuration.
