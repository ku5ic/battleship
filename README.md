# Battleship

A browser-based Battleship implementation in React and TypeScript. The game renders a 10×10 grid, loads a static ship layout, and lets a player fire shots until the fleet is sunk. The implementation demonstrates feature-based frontend architecture, pure-function domain logic, accessibility-first UI, and thorough automated testing.

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

CI runs `typecheck` → `lint` → `format:check` → `test`. All four must pass.

---

## Architecture

The core idea is that Battleship rules are a pure domain problem. React serves as a rendering shell; all game logic lives in plain TypeScript functions that have no React dependency. Full reasoning is in [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md).

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

The `battleship` feature folder owns everything domain-specific. The top-level `components/` folder holds components that are domain-aware by props but not by logic — `Board` and `Cell` know how to render a grid, but nothing about ships or shot resolution.

### Hook and service boundaries

`useBattleshipGame` is the single hook that calls the engine. It uses `useReducer` rather than multiple `useState` calls because the `FIRE` action requires the shots map and the last result to update atomically. Only two values are persisted in the reducer: `shots` and `lastResult`. Everything else — `sunkShipIds`, `isGameOver` — is derived with `useMemo`.

Service functions (`resolveShot`, `isShipSunk`, `isGameOver`) are pure: they receive values, return values, and touch no external state. This is what makes them straightforward to test and reason about.

---

## Testing

Tests live in `src/test/`, mirroring the `src/` structure.

**Domain logic** (engine functions, `parseLayout`, coordinate utilities) has thorough unit test coverage. These are pure functions with no dependencies — tests are fast, deterministic, and directly encode the game rules. A failure here means a rule is broken.

**Component tests** cover rendering, user interaction, and accessibility contracts. Queries use accessible-name matchers, so the tests verify what a user or assistive technology would actually observe.

**Integration tests** (`BattleshipGame.test.tsx`) exercise a full game flow against the known ship layout. They verify that a complete playthrough reaches game-over state and that reset restores the initial board.

```bash
npm run test
npm run test:coverage
```

---

## Accessibility

WCAG 2.2 AA compliance was a first-class requirement throughout, not a retrofit.

Board cells are `<button>` elements with `disabled` state — no div click handlers. Each cell's accessible name encodes its column letter, row number, and current status, for example `"C4, hit"` or `"A1, not fired. Press Space to fire"`. The grid uses `role="grid"` with `aria-rowcount`, `aria-colcount`, and `aria-readonly`; keyboard navigation is fully implemented via arrow keys with roving tabindex.

`ShotResultAnnouncer` is a visually hidden `aria-live="polite"` region, always present in the DOM so assistive technology has it registered before the first event. A `key` prop forces remount on each result so repeated identical outcomes are re-announced reliably. `GameStatus` uses `role="status"` at game over — a stable state change, not a transient event — and the two announcement mechanisms are kept separate to prevent them from clobbering each other.

Hit and miss states are communicated through both color and iconography (× for hits, dot for misses). Color is never the sole differentiator. Focus rings use high-contrast yellow visible against the dark board at any cell state.

---

## Responsiveness

The board is wrapped in a horizontal scroll container. On narrow screens it scrolls rather than shrinking cells below usable size. The layout has been tested from 320px (iPhone 5) up to 1440px desktop.
