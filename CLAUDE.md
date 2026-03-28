# Claude Code Instructions

This file governs how Claude Code operates in this repository. Read it in full before generating, modifying, or reviewing any code.

---

## Read before touching code

1. Search the existing codebase before writing anything. Do not reinvent types, utilities, or logic that already exist.
2. Produce only the delta — the minimum change that satisfies the task.
3. If a task is ambiguous, ask one focused clarification question. Do not guess.
4. If a request conflicts with the rules below, explain why and propose the correct approach instead of complying.

---

## Repository map

```
src/
  app/                          # App.tsx — entry point and mode toggle only
  components/
    board/                      # Board, Cell — generic grid rendering, no domain knowledge
    game/                       # BattleshipGame, BattleshipMultiplayerGame — wiring only
  features/
    battleship/
      components/               # Presentational feature components, props-in/callbacks-out
      constants/                # BOARD_SIZE, column labels, ship display names
      data/                     # config.ts (raw JSON), layout.ts (parseLayout), index.ts
      hooks/                    # useBattleshipGame, useBattleshipSessionGame
      services/                 # Pure engine and AI functions — no React
      types/                    # All domain types — single source of truth
      utils/                    # Pure coordinate helpers
  lib/                          # Shared utilities — cn() only
  test/                         # Mirrors src/ — one test file per source file
```

Every new file must land in the correct layer. If the right layer is ambiguous, ask before creating.

---

## Layer contracts

### `types/`

- Single source of truth for all domain types.
- No logic, no imports from other feature layers, no React.
- Adding a concept to the domain means adding a type here first.
- `any` is forbidden. Use `unknown` with a type guard if the shape is genuinely unknown.

### `data/`

- Parses and validates raw input once at module load.
- `parseLayout` throws on invalid input — this is intentional. The layout is static; an error is a programming mistake, not a runtime condition.
- Parsed output is exported as a module-scope constant. Nothing re-parses at runtime.
- No React, no hooks, no side effects beyond the initial parse.

### `utils/`

- Pure functions only. No state, no side effects, no React.
- `toKey()` is the single point of `CoordinateKey` production. Do not construct `"col,row"` strings anywhere else.
- `RawCoordinate` tuples must not escape this layer or the data layer.

### `services/`

- Pure functions only. No React imports, no hooks, no `useEffect`.
- Own all game rules: hit detection, miss detection, sunk logic, game-over logic, AI coordinate selection.
- Independently unit testable with no React dependency.
- Never call `toKey()` inline — import from `utils/`. Never reconstruct a `CoordinateKey` by string interpolation outside `toKey`.

### `hooks/`

- Orchestrate feature-level state and side effects.
- `useReducer` is preferred over multiple `useState` calls when transitions have guard logic or need to be atomic.
- Reducers must stay synchronous. Async behaviour (AI timing, network) belongs in `useEffect` — the effect dispatches an action carrying a pre-resolved value.
- Derive values with `useMemo`. Do not persist what can be derived.
- Module-scope constants (position indexes, ship arrays) are computed once, not inside the hook body.
- Hooks expose typed, view-ready data. They do not expose raw state slices.

### `components/board/` and `components/game/`

- `Board` and `Cell` render a grid. They have no knowledge of ships, fleets, or game rules.
- `BattleshipGame` and `BattleshipMultiplayerGame` are wiring components — the only place hooks are called. They pass results down as props; they contain no logic of their own.
- Wiring components are the sole callers of their respective hooks.

### `features/battleship/components/`

- Presentational only: receive props, render UI, emit callbacks.
- No game rules, no direct hook calls, no data parsing, no domain calculations.
- Derive nothing from raw state — receive only what the hook has already prepared.

### `app/`

- `App.tsx` handles mode toggling and mounts the correct game component. Nothing else.
- Switching mode unmounts the current game; reset is implicit, not explicit.

---

## Component composition rules

### What a component must do

- Receive props and render UI.
- Emit user intent via typed callback props.
- Be fully understandable in isolation.

### What a component must not do

- Contain game rules or derive game outcomes.
- Call hooks other than the designated wiring component.
- Reach into sibling or parent state.
- Mix rendering with domain computation.
- Own data parsing or validation.
- Use `any` in props or internal types.

### Naming and structure

- One component per file. File name matches the exported component name exactly.
- Props interfaces are defined in the same file as the component. If a props type is shared, it belongs in `types/`.
- Do not create a component to solve a logic problem. Extract logic to a service or hook first, then render the result.
- Do not create a component purely to reduce line count. Extract only when it aids clarity or reuse.

---

## State design rules

**Persist only:** shots fired, last shot result, sunk ship IDs, game-over flag, session turn state, AI thinking flag.

**Derive with `useMemo`:** whether a cell is hit or miss, whether a ship is sunk, whether all ships are sunk, status labels, shot counts.

**Never duplicate a source of truth.** If a value can be computed from persisted state plus constants, it must be computed, not stored.

**Atomic updates.** When two values must change together (e.g. shots + lastResult), use `useReducer` so the update is a single dispatch.

---

## Coordinate rules

- `CoordinateKey` is `${number},${number}` — a template literal type, not a plain string.
- `toKey(col, row)` is the only legal production site. No inline string interpolation.
- `RawCoordinate` `[col, row]` tuples exist only in `data/` and are converted immediately on parse.
- `fromKey` is the only legal parse site. No manual splitting of key strings.
- Coordinates are 0-indexed. `col` is the horizontal axis; `row` is the vertical axis.

---

## TypeScript rules

- `any` is forbidden everywhere. ESLint enforces this.
- Use `satisfies` for type-checking object literals without widening.
- Use template literal types for constrained string values (`CoordinateKey`, `ShipType`).
- Prefer type aliases over interfaces for union types and template literals.
- Import types with `import type`. ESLint enforces `@typescript-eslint/consistent-type-imports`.
- Do not use type assertions (`as`) to paper over a type error. Fix the type.

---

## Accessibility rules (WCAG 2.2 AA — non-negotiable)

- Interactive cells must be `<button>` elements. No `div` click handlers.
- Every cell must have a computed accessible name encoding: column letter + row number + current state. Fireable cells must append a hint (`"Press Space to fire"`).
- `aria-live="polite"` announcers for transient shot events (hit, miss, sunk). Use separate announcer instances for concurrent event sources so they do not clobber each other.
- Use the `key` prop remount technique when the same announcement must repeat (e.g. multiple misses in a row).
- Keyboard navigation is mandatory: arrow keys, roving tabindex, focus advancement after a shot.
- Focus advancement after firing must be deferred with `requestAnimationFrame` to avoid a race with the disabled-state flush.
- Color is never the sole differentiator for state. Hit and miss must have distinct icons as well as distinct colors.
- Touch targets must meet minimum size requirements at all breakpoints including 320px width.
- Contrast must meet AA at every cell state.

---

## Testing rules

### Domain (services, utils, data)

- Thorough unit coverage. Pure functions with no dependencies — test every rule, edge case, and guard.
- A test failure here means a game rule is broken.

### Hooks

- Test with `renderHook`.
- Export timing constants (e.g. `AI_SHOT_DELAY_MS`) and override to `0` in tests. Do not use `vi.useFakeTimers()` — it conflicts with `userEvent`.
- Mock non-deterministic collaborators (e.g. `chooseRandomUnfiredCoordinate`) to a fixed coordinate.

### Components

- Use `data-coord` attributes for cell targeting. Do not use `aria-label` regex patterns — they are ambiguous against row-10 variants (e.g. `/B1/` matches `B10`).
- Use exact rendered strings in assertions. Avoid loose regex patterns.
- Cover: rendering, user interaction, hit/miss rendering, sunk messaging, game-over display.
- Include accessibility-relevant assertions where practical.

### Structure

- `src/test/` mirrors `src/`. One test file per source file.
- All four CI gates must pass: `typecheck`, `lint`, `format:check`, `test`.

---

## Style rules

- Tailwind utility classes for all styling. No inline `style` props without a documented reason.
- Use `cn()` from `lib/` for conditional class composition.
- Do not produce long, unreadable class strings on a single element — extract a small presentational component if it aids clarity.
- No `@apply` unless the use case is explicitly justified.

---

## Code quality bar

- Code must read naturally, as though manually written and reviewed by a senior engineer.
- Names must be meaningful and consistent with existing conventions in the codebase.
- Avoid generic or obvious comments. Comments explain *why*, not *what*.
- Avoid unnecessary abstraction. Every abstraction must be justifiable in a code review.
- Prefer explicit over magical. Prefer pure functions for game rules.
- Implement only what is needed. Structure for clean extension, but do not build the extension.
- When uncertain between two approaches, choose the one that is easier to explain in a code review.

---

## What to do when generating code

1. Search the project knowledge base and existing source files first.
2. Identify the correct layer for each piece of logic.
3. Write the minimum change. Do not modify unrelated files.
4. Verify: does each new function, type, or component have a clear, single responsibility?
5. Verify: does anything new duplicate something that already exists?
6. Verify: do all four CI gates still pass after the change?
7. List every modified file with its relative path. Do not summarise content — show the diff or full file.
