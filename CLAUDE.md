# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

---

## Commands

```bash
npm run dev              # Vite dev server at http://localhost:5173
npm run build            # tsc -b && vite build
npm run typecheck        # tsc --noEmit
npm run lint             # ESLint across src/ (zero warnings allowed)
npm run format           # Prettier write
npm run format:check     # Prettier check
npm run test             # Vitest run (all tests)
npm run test:coverage    # Vitest with v8 coverage
```

Run a single test file:
```bash
npx vitest run src/test/features/battleship/services/engine.test.ts
```

Filter by test name:
```bash
npx vitest run -t "resolveShot"
```

CI gate: `typecheck` → `lint` → `format:check` → `test`. All four must pass.

---

## Architecture

The codebase follows a strict layering principle: game rules live in plain TypeScript, React is a thin rendering shell. The dependency flow is one-directional:

```
types → data → utils → services → hooks → components
```

### Path alias

`@` resolves to `src/`. Use `@/features/battleship/...` throughout.

### Layer responsibilities

**`features/battleship/types/`** — all domain types. Key types: `CoordinateKey` (template literal `${number},${number}`), `Ship`, `CellStatus`, `ShotOutcome`, `ShotResult`, `GameState`, `BoardState` (alias for `GameState`), `SessionState`.

**`features/battleship/data/`** — `parseLayout()` converts raw JSON config into typed `Ship[]` with eager validation (bounds, size, overlap, contiguity). Throws on any violation. The exported `SHIPS` constant is computed once at module load. Nothing else calls `parseLayout`.

**`features/battleship/utils/coordinates.ts`** — all coordinate manipulation. `toKey()` is the single place that produces `CoordinateKey` strings — nothing constructs them by hand.

**`features/battleship/services/engine.ts`** — pure domain logic: `buildPositionIndex`, `resolveShot`, `applyShotToBoard`, `isShipSunk`, `isGameOver`, `outcomeToStatus`. No React dependency. `resolveShot` is used by the single-player hook directly; `applyShotToBoard` (which wraps `resolveShot` and returns a full new `BoardState`) is used by the session hook reducer.

**`features/battleship/services/ai.ts`** — single pure function `chooseRandomUnfiredCoordinate(shotsReceived)`. No timing logic; that belongs in the hook.

**`features/battleship/hooks/useBattleshipGame.ts`** — single-player hook. `useReducer` with `FIRE`/`RESET`. Persists only `shots` and `lastResult`; derives `sunkShipIds` and `isGameOver` via `useMemo`.

**`features/battleship/hooks/useBattleshipSessionGame.ts`** — vs-computer hook. `useReducer` with `PLAYER_FIRE`/`COMPUTER_FIRE`/`RESET`. Reducer is strictly synchronous. AI timing (`AI_SHOT_DELAY_MS`) lives in a `useEffect` that dispatches `COMPUTER_FIRE` after a delay; cleanup cancels the timeout. `AI_SHOT_DELAY_MS` is exported so tests can override it to `0`.

### Component structure

`BattleshipGame` is the only component that calls `useBattleshipGame`. `BattleshipMultiplayerGame` is the only component that calls `useBattleshipSessionGame`. Both are wiring components — they pass hook output down as props; nothing below them touches hooks or services.

`Board` is shared across both modes. The `isReadOnly` prop disables all cells and sets `aria-readonly` on the grid — used for the player's own board in vs-computer mode.

`ShotResultAnnouncer` is a visually hidden `aria-live="polite"` region. Multiplayer mode mounts two instances (one per board) to prevent concurrent events from clobbering each other. A `key` prop forces remount on each result so repeated identical outcomes are re-announced.

`App` renders a mode toggle (`aria-pressed` buttons). Switching mode unmounts the current game component, resetting state without any explicit reset call.

### Testing conventions

- Test files mirror `src/` under `src/test/`
- Target cells via `data-coord` attributes, not aria-label regex
- Mock `chooseRandomUnfiredCoordinate` and set `AI_SHOT_DELAY_MS = 0` in session hook tests to avoid fake timers (they conflict with `userEvent`)
- Domain logic (engine, coordinates, layout) has unit tests; component/integration tests use Testing Library with accessible-name queries

### Accessibility constraints

WCAG 2.2 AA. Board cells are `<button>` elements. Each cell's accessible name encodes column letter, row number, and status. `GameStatus` uses `role="status"` for stable state transitions; `ShotResultAnnouncer` uses `aria-live="polite"` for transient shot events. Color is never the sole signal — hits use × icon, misses use dot icon.
