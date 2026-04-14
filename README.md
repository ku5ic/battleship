# Battleship

A Battleship game built in React and TypeScript. Not as an end in itself, but as a vehicle for demonstrating how I think about frontend architecture. The interesting part is not the game. It is where the logic lives, how state is shaped, how layer boundaries are enforced, and how accessibility is treated as a constraint from day one rather than retrofitted later.

**[Play it live](https://ku5ic.github.io/battleship/)**

---

## What this demonstrates

Five claims. Each is verifiable by opening the referenced files.

**1. Domain logic is fully decoupled from React.**
Game rules (hit detection, sunk ship resolution, turn management, game-over detection) live in pure TypeScript functions under `engine/` and `services/`. They have no React imports. The same engine reducers power both the browser UI and a standalone CLI runner (`src/cli/`) with zero modifications. The CLI is not a demo. It is proof that the layer boundaries are real.

**2. State is minimal and derived, not duplicated.**
Each game hook persists only what cannot be computed: the shots map, the last shot result, and (in vs-computer mode) the active turn. Everything else (whether a cell is hit, whether a ship is sunk, whether the game is over, who won) is derived via `useMemo`. There is one source of truth per fact. Open any hook in `hooks/` and look for persisted state: you will find `useReducer` with two or three fields, not ten.

**3. Atomic state transitions prevent inconsistent renders.**
Firing a shot updates the shots map and the last result in a single `useReducer` dispatch. Two separate `useState` calls would create a frame where the shot count and the result disagree. The reducer is synchronous and pure (`(state, action) => state`) with side effects (AI delay, focus management) handled outside the reducer in `useEffect`.

**4. Accessibility meets WCAG 2.2 AA, verified in implementation.**
All interactive cells are `<button>` elements with computed accessible names encoding column, row, and current state. Keyboard navigation uses roving tabindex with `requestAnimationFrame`-deferred focus advancement after a shot. Shot results are announced via `aria-live` regions with separate announcer instances to prevent concurrent events from clobbering each other. Color is never the sole indicator of state; hit and miss have distinct icons. Touch targets meet WCAG 2.5.8 (24px minimum) at all difficulties. On moderate and hard boards at very narrow viewports the grid scrolls horizontally to preserve the minimum target size. Contrast meets AA at every cell state.

**5. Tests target the layer where a regression would hurt.**
Domain functions have thorough unit coverage. A failure there means a game rule is broken. Hook tests use `renderHook` with deterministic AI mocks and exported timing constants overridden to `0` (no fake timers, which conflict with `userEvent`). Component tests target cells by `data-coord` attribute to avoid ambiguity with row-10 variants. The test directory mirrors `src/` one-to-one.

---

## Architecture

React is a thin rendering shell around a pure domain layer. Components render state and emit intent. Hooks wire engine reducers to the view via `useReducer`. The engine layer owns state transitions as pure `(state, action) => state` functions. Services own the rules. Both the React frontend and the CLI consume the same engine and service layers. The engine has no knowledge of either consumer.

Full reasoning (including what is persisted vs derived, why `useReducer` was chosen, what the layer boundaries enforce, and what would change with more time) is in [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md).

### Folder structure

```
src/
  app/                        # Entry point: mode toggle, sticky header, status slot
  battleship/
    components/               # Presentational feature components: props in, callbacks out
    constants/                # Difficulty config, ship display names, shot outcome labels
    data/                     # Raw config and layout parsing
    engine/                   # Pure (state, action) => state reducers, no React
    hooks/                    # useSinglePlayerGame, useVsComputerGame: wiring over engine
    services/                 # Pure rule evaluation and AI coordinate selection
    types/                    # All domain types: single source of truth
    utils/                    # Coordinate helpers: toKey, fromKey, allBoardKeys, and related utilities
  cli/                        # Terminal runner: drives engine directly, no React
  components/
    board/                    # Board and Cell: generic grid rendering, keyboard navigation
    game/                     # Wiring components: hooks called here only
  lib/                        # Shared utilities (cn)
  test/                       # Mirrors src/: one test file per source file
```

Each layer has a single responsibility. `services/` owns rules but not state transitions. `engine/` owns state transitions but not rendering. `hooks/` wire engine to React but contain no reducer logic. `components/` render what hooks prepare but derive nothing from raw state. A function that does not belong in a layer cannot be placed there. The dependency rules enforce this.

---

## Stack

| Layer      | Technology                                                     |
| ---------- | -------------------------------------------------------------- |
| UI         | React 19                                                       |
| Language   | TypeScript (strict mode, `any` forbidden)                      |
| Build      | Vite                                                           |
| Styling    | Tailwind CSS v4 via `@tailwindcss/vite`                        |
| Testing    | Vitest + Testing Library                                       |
| Linting    | ESLint 9 with flat config, `strictTypeChecked`, and `jsx-a11y` |
| Formatting | Prettier, enforced in CI                                       |

---

## Game modes

### Single player

Fire at a hidden fleet until all ships are sunk. No opponent turn.

### vs Computer

Both sides have their own fleet. The player fires at the computer's board; the computer fires back after a short delay. A hit earns another shot; a miss hands the turn over. The game ends when one fleet is entirely sunk.

### Difficulty

Board size scales with difficulty. Fleet composition is fixed.

| Difficulty | Board | Columns |
| ---------- | ----- | ------- |
| Easy       | 10×10 | A–J     |
| Moderate   | 15×15 | A–O     |
| Hard       | 20×20 | A–T     |

### CLI

A terminal interface that drives the same engine reducers as the React frontend. Supports both single-player and vs-computer modes with difficulty selection.

```bash
npm run cli
```

The CLI omits colours, ANSI formatting, game persistence, and the AI shot delay. In a terminal, results print synchronously, so the delay serves no purpose. Both modes use randomly generated fleets; there is no placement phase.

---

## Setup

**Requirements:** Node 18+

```bash
npm install
npm run dev
```

Dev server starts at `http://localhost:5173`.

---

## Scripts

| Script                  | Description                                 |
| ----------------------- | ------------------------------------------- |
| `npm run dev`           | Start Vite dev server with HMR              |
| `npm run build`         | Type-check and produce a production build   |
| `npm run preview`       | Serve the production build locally          |
| `npm run test`          | Run the full test suite once                |
| `npm run test:watch`    | Run tests in watch mode                     |
| `npm run test:coverage` | Run tests and emit a coverage report        |
| `npm run lint`          | ESLint across `src/`, zero warnings allowed |
| `npm run format`        | Format `src/` with Prettier                 |
| `npm run format:check`  | Check formatting without writing            |
| `npm run typecheck`     | Type-check without emitting                 |
| `npm run cli`           | Play Battleship in the terminal via tsx     |

CI runs `typecheck`, then `lint`, then `format:check`, then `test`. All four must pass on every push.

---

## Testing

Tests are prioritised by the cost of a regression.

**Domain layer:** thorough unit coverage. Pure functions with no dependencies. A failure here means a game rule is wrong.

**Hook layer:** `renderHook` with deterministic AI mocks and timing constants overridden to `0`. No `vi.useFakeTimers()`, which conflicts with `userEvent`.

**Component layer:** rendering, interaction, hit/miss states, sunk and game-over messaging. Cells targeted by `data-coord` attribute to avoid ambiguity against row-10 variants.

---

## Accessibility

The implementation targets WCAG 2.2 AA.

- Board cells are `<button>` elements, not `<div>` with click handlers
- Each cell has a computed accessible name: column letter, row number, current state, and a "Press Space to fire" hint on fireable cells
- Keyboard navigation uses roving tabindex on both the game board and the placement grid, backed by a shared `useGridNavigation` hook; on the game board, focus advances after a shot via `requestAnimationFrame`-deferred imperative focus to avoid a race with the disabled-state flush
- Shot results are announced via `aria-live="polite"` regions; separate announcer instances prevent concurrent events from clobbering each other; the `key` remount technique handles repeated identical announcements
- Color is backed by icons; hit and miss have distinct visual indicators beyond colour alone
- Touch targets meet WCAG 2.5.8 (24px minimum) at all difficulties; on narrow viewports the board scrolls horizontally rather than shrinking cells below the threshold. Contrast meets AA at every cell state

---

## AI workflow

This project was built using a structured approach to AI-assisted development. AI generated drafts (components, hooks, services, tests) against a detailed specification and a strict set of architectural rules. Every output was reviewed, questioned, and either accepted, corrected, or rejected before being committed.

The workflow is encoded in `.claude/commands/` as a sequence of phases: preflight audit, implementation plan, code generation, verification, and review. No code was written before the plan was approved; no code was committed before the verify step passed. All architectural decisions (what to persist, where logic lives, how layers interact) were made and owned by me.

[`docs/AI_USAGE.md`](docs/AI_USAGE.md) documents the specific tools, workflow, and the reasoning behind treating AI as a capable but supervised collaborator.
