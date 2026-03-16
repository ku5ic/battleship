# Battleship

A Battleship implementation built as a take-home assignment for a Senior Frontend Engineer role. The game renders a 10×10 grid, consumes a static ship layout, and supports two modes: a single-player game against a hidden fleet, and a vs-computer mode where the player fires at the opponent while the computer fires back.

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

## Game Modes

### Single player

The classic assignment scope. The player fires at a hidden 10×10 fleet until all ships are sunk. Turn management is not required — there is no opponent.

### vs Computer

An extended mode where both the player and the computer have their own fleet. The player fires at the computer's board; the computer fires back at the player's board after a short delay. Standard Battleship turn rules apply: a hit earns another shot, a miss hands the turn to the opponent. The session ends when one fleet is entirely sunk.

The mode toggle is in the top bar. Switching modes resets both games cleanly.

---

## Overview

The game rules are treated as a pure domain problem. React is a thin rendering shell around them.

- **Components** receive props, render UI, and emit callbacks. They contain no game logic.
- **Hooks** (`useBattleshipGame`, `useBattleshipSessionGame`) orchestrate state and expose typed view-ready data. All rule evaluation is delegated to the service layer.
- **Service functions** (`resolveShot`, `applyShotToBoard`, `isShipSunk`, `isGameOver`) are pure TypeScript with no React dependency. They are the authoritative source for what a hit, miss, sunk ship, and game over mean.
- **The AI service** (`chooseRandomUnfiredCoordinate`) is a pure function that picks a random unfired coordinate. The `useEffect` in the session hook owns the timing delay and dispatch — the reducer stays synchronous.
- **The data layer** parses and validates the raw ship layout once at startup. The parsed result is static for the life of the session.

---

## Architecture

Full reasoning is in [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md). A brief summary:

### Folder structure

```
src/
  app/                        # App entry point and mode toggle
  components/
    board/                    # Board and Cell — grid rendering (shared)
    game/                     # BattleshipGame, BattleshipMultiplayerGame
  features/
    battleship/
      components/             # Presentational feature components
      constants/              # BOARD_SIZE, column labels, ship display names
      data/                   # Raw config and parseLayout()
      hooks/                  # useBattleshipGame, useBattleshipSessionGame
      services/               # Pure engine functions and AI helper
      types/                  # All domain types
      utils/                  # Coordinate utilities
  lib/                        # Shared utilities (cn)
  test/                       # Mirrors src/ structure
```

### State design

**Single-player hook** — persists only `shots` and `lastResult`. Everything else is derived via `useMemo`.

**Session hook** — persists `SessionState`: two `BoardState` instances (player and computer), `activeTurn`, `winner`, and `isAiThinking`. Each `BoardState` is structurally identical to `GameState`. The reducer handles `PLAYER_FIRE`, `COMPUTER_FIRE`, and `RESET` synchronously. Turn switching, win detection, and `isAiThinking` are all derived inside the reducer from the shot result. The AI `setTimeout` lives in a `useEffect` and dispatches `COMPUTER_FIRE` after the delay — no async logic ever enters the reducer.

### Coordinate system

Coordinates are 0-indexed `[col, row]` matching the raw layout data. The canonical identity throughout the app is a `CoordinateKey` template literal type (`${number},${number}`). Raw tuples exist only at the config boundary and are converted immediately. This makes `Map` and `Set` lookups correct by default.

### Board reuse

The `Board` component is shared between both modes. It accepts an optional `isReadOnly` prop. When true, all cells are disabled and `aria-readonly` is set on the grid — used for the player's own board in vs-computer mode, where cells display incoming shots but are not fireable.

---

## Testing

Tests are in `src/test/`, mirroring the `src/` structure.

**Domain logic (unit tests)** — the highest-value tests. Pure functions: coordinate normalization, layout validation, hit/miss/sunk/game-over detection, `applyShotToBoard` immutability, and `chooseRandomUnfiredCoordinate` boundary cases.

**Hook tests** — `useBattleshipGame` and `useBattleshipSessionGame` tested with `renderHook`. The session hook tests mock `chooseRandomUnfiredCoordinate` to a fixed coordinate and set `AI_SHOT_DELAY_MS` to `0` to keep tests synchronous without fake timers.

**Component tests** — cover rendering, user interaction, and accessibility contracts. `data-coord` attributes are used for unambiguous cell targeting.

**Integration tests** — `BattleshipGame.test.tsx` exercises single-player flow end-to-end. `BattleshipMultiplayerGame.test.tsx` exercises the two-board session: player hits and misses, AI turn mechanics, sunk ships, player victory, and reset.

```bash
npm run test
npm run test:coverage
```

---

## Accessibility

WCAG 2.2 AA compliance was a first-class requirement throughout.

- Board cells are `<button>` elements. No div click handlers.
- Each cell's accessible name encodes column letter, row number, and current state — e.g. `"C4, hit"` or `"A1, not fired. Press Space to fire"`.
- The grid uses `role="grid"` with `aria-rowcount`, `aria-colcount`, and `aria-readonly`. Arrow key navigation is implemented with roving tabindex.
- `ShotResultAnnouncer` is a visually hidden `aria-live="polite"` region. A `key` prop forces remount on each result so repeated identical outcomes are re-announced. In vs-computer mode, two separate announcers are mounted — one per board — so player and computer shot events do not clobber each other.
- `GameStatus` (single-player) and `GameStatusMultiplayer` (session) use `role="status"` for stable game-state transitions, kept separate from the transient shot announcers.
- `GameStatusMultiplayer` communicates turn state (`"Your turn — select a cell to fire."`, `"Computer is thinking…"`) and session outcome (`"You win!"`, `"Defeated."`) via the same `role="status"` element, ensuring screen reader users always have current context.
- Hit and miss states are communicated through color and distinct iconography. Color is never the sole differentiator.
- Focus rings use high-contrast yellow. Touch targets meet minimum size at all breakpoints from 320px upward.

---

## Responsiveness

The board is wrapped in a horizontal scroll container. On narrow screens it scrolls rather than shrinking cells. The two-board layout stacks vertically on small screens and sits side-by-side on `lg` breakpoints. Tested at 320px (iPhone 5) through 1440px desktop.

---

## Docs

| File                                                                 | Contents                                                                                                          |
| -------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------- |
| [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md)                       | Layer responsibilities, state design, coordinate system, accessibility and testing strategy, deliberate omissions |
| [`docs/AI_USAGE.md`](docs/AI_USAGE.md)                               | Where AI assistance was used, what was changed, what was rejected, and the author's responsibility statement      |
| [`docs/AI_PROJECT_INSTRUCTIONS.md`](docs/AI_PROJECT_INSTRUCTIONS.md) | Original engineering brief used to guide the implementation                                                       |

---

## Out of scope

Player ship placement, persistence, and animations are excluded. The vs-computer mode goes beyond the original assignment scope and was added to demonstrate the architectural extensibility of the domain layer — the engine required no changes, only a new hook and wiring component.
