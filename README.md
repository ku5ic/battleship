# Battleship

A browser-based Battleship game built with React and TypeScript. The primary purpose of this project is to demonstrate how I approach frontend architecture: where logic lives, how state is shaped, how the UI layer stays thin, and how accessibility is treated as a first-class constraint rather than an afterthought.

**[Play it live →](https://ku5ic.github.io/battleship/)**

---

## What this demonstrates

This is not a tutorial project or a boilerplate. Every decision here has a specific reason behind it, and the architecture is designed to be readable and defensible in a code review.

**Pure domain logic.** Game rules — hit detection, sunk ship resolution, turn management, game-over detection — live in plain TypeScript functions with no React dependency. They are independently unit-testable and have no awareness of how they are rendered.

**Derived state over persisted state.** Each hook persists only what cannot be computed: the shots map and last shot result (single-player adds nothing else; the session hook adds per-player shots, per-player results, and the active turn). Everything else — whether a cell is hit or missed, whether a ship is sunk, whether the game is over, who the winner is — is derived via `useMemo`. There is no duplicated source of truth.

**`useReducer` for atomic transitions.** Firing a shot updates the shots map and the last result in a single dispatch. Two separate `useState` calls would make an inconsistent intermediate state possible. The reducer is synchronous; the AI timing side effect lives in a `useEffect` that dispatches a pre-resolved action.

**Accessibility as a constraint, not a feature.** All interactive cells are `<button>` elements with computed accessible names encoding column, row, and current state. Keyboard navigation uses roving tabindex. Shot results are announced via `aria-live` regions. Color is never the sole indicator of state. The implementation targets WCAG 2.2 AA.

**Tested at the right layer.** Domain logic has thorough unit test coverage because a regression there means a rule is broken. Hook tests use `renderHook` with deterministic AI mocks and exported timing constants rather than fake timers. Component tests use `data-coord` attributes for unambiguous cell targeting.

---

## Game modes

### Single player

Fire at a hidden fleet until all ships are sunk. No opponent turn.

### vs Computer

Both sides have their own fleet. The player fires at the computer's board; the computer fires back after a short delay. A hit earns another shot; a miss hands the turn over. The session ends when one fleet is entirely sunk.

### Difficulty

Board size scales with difficulty. Fleet composition is fixed.

| Difficulty | Board | Columns |
| ---------- | ----- | ------- |
| Easy       | 10×10 | A–J     |
| Moderate   | 15×15 | A–O     |
| Hard       | 20×20 | A–T     |

---

## Stack

- **React 19** — UI rendering
- **TypeScript** — strict mode, no `any`
- **Vite** — build and dev server
- **Tailwind CSS v4** — utility-first styling via `@tailwindcss/vite`
- **Vitest + Testing Library** — unit and component tests
- **ESLint 9** — flat config with `tseslint.configs.strictTypeChecked` and `eslint-plugin-jsx-a11y`
- **Prettier** — formatting enforced in CI

---

## Architecture

The core principle is that React is a thin rendering shell around a pure domain layer. Components render state and emit intent. Hooks orchestrate feature-level interaction. Services contain the rules.

Full reasoning — including what is persisted vs derived, why `useReducer` was chosen, what the layer boundaries enforce, and what would change with more time — is in [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md).

### Folder structure

```
src/
  app/                        # Entry point and mode toggle
  components/
    board/                    # Board and Cell — generic grid rendering
    game/                     # Wiring components — hooks called here only
  features/
    battleship/
      components/             # Presentational feature components
      constants/              # Board size, difficulty config, labels
      data/                   # Raw config and parseLayout()
      hooks/                  # useBattleshipGame, useBattleshipSessionGame
      services/               # Pure engine functions and AI helper
      types/                  # All domain types — single source of truth
      utils/                  # Coordinate utilities
  lib/                        # Shared utilities (cn)
  test/                       # Mirrors src/ — one test file per source file
```

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

| Script                  | Description                                  |
| ----------------------- | -------------------------------------------- |
| `npm run dev`           | Start Vite dev server with HMR               |
| `npm run build`         | Type-check and produce a production build    |
| `npm run preview`       | Serve the production build locally           |
| `npm run test`          | Run the full test suite once                 |
| `npm run test:watch`    | Run tests in watch mode                      |
| `npm run test:coverage` | Run tests and emit a coverage report         |
| `npm run lint`          | ESLint across `src/` — zero warnings allowed |
| `npm run format`        | Format `src/` with Prettier                  |
| `npm run format:check`  | Check formatting without writing             |
| `npm run typecheck`     | Type-check without emitting                  |

CI runs `typecheck` → `lint` → `format:check` → `test`. All four must pass on every push.

---

## Testing

Tests are prioritized by the cost of a regression.

**Domain layer** — thorough unit coverage. Pure functions with no dependencies. A failure here means a game rule is wrong.

**Hook layer** — `renderHook` with deterministic AI mocks and timing constants overridden to `0`. No `vi.useFakeTimers()`, which conflicts with `userEvent`.

**Component layer** — rendering, interaction, hit/miss states, sunk and game-over messaging. Cells targeted by `data-coord` attribute to avoid ambiguity against row-10 variants.

---

## Accessibility

The implementation targets WCAG 2.2 AA. Specific choices:

- Board cells are `<button>` elements — not `<div>` with click handlers
- Each cell has a computed accessible name: column letter, row number, current state, and a "Press Space to fire" hint on fireable cells
- Keyboard navigation uses roving tabindex; focus advances after a shot via `requestAnimationFrame`-deferred imperative focus to avoid a race with the disabled-state flush
- Shot results are announced via `aria-live="polite"` regions; separate announcer instances prevent concurrent events from clobbering each other; the `key` remount technique handles repeated identical announcements
- Color is backed by icons — hit and miss have distinct visual indicators beyond color alone
- Touch targets and contrast meet AA requirements at all breakpoints including 320px width

---

## AI workflow

This project was built using an opinionated, structured approach to AI-assisted development. AI generated drafts — components, hooks, services, tests — against a detailed specification and a strict set of architectural rules. Every output was reviewed, questioned, and either accepted, corrected, or rejected before anything was committed.

The workflow is encoded in `.claude/commands/` as a sequence of phases: preflight audit, implementation plan, code generation, verification, and review. No code was written before the plan was approved; no code was committed before the verify step passed. All architectural decisions — what to persist, where logic lives, how layers interact — were made and owned by me.

[`docs/AI_USAGE.md`](docs/AI_USAGE.md) documents the specific tools, workflow, and the reasoning behind treating AI as a capable but supervised collaborator.
