---
name: react-architecture
description: Enforce production-grade React and TypeScript architecture. Use this skill whenever generating, reviewing, or refactoring React components, hooks, services, or state — especially when layer separation, state shape, composition, or TypeScript strictness is involved. Triggers include: writing a new component, hook, or service; refactoring existing files; reviewing whether logic belongs in a component vs hook vs service; designing state shape; choosing between useState and useReducer; deciding what to persist vs derive. Always consult this skill before producing any React or TypeScript code in this project.
---

# React Architecture Skill

This skill encodes the architecture, layer contracts, and engineering standards for this project. Read it before generating or modifying any React or TypeScript file.

---

## Core principle

React is a thin rendering shell around a pure domain layer. Game rules, calculations, and data transformations belong in plain TypeScript. Components render state and emit intent — nothing more.

---

## Layer contracts

### `utils/` — coordinate helpers

- Pure functions only — no state, no side effects, no React
- `toKey(col, row)` is the single point of `CoordinateKey` production — no inline string interpolation anywhere else
- `RawCoordinate` tuples must not escape `data/` or `utils/`

### `services/` — pure game rules

- Pure functions only — no React imports, no hooks, no effects
- Own all rule evaluation: hit detection, miss, sunk, game-over, AI coordinate selection
- Unit-testable with zero React dependency
- Never reconstruct a `CoordinateKey` outside `toKey()`

### `hooks/` — state orchestration

- `useReducer` over multiple `useState` when transitions have guard logic or need to be atomic
- Reducers are synchronous — async behaviour (AI timing, network) belongs in `useEffect`; the effect dispatches a pre-resolved value
- Derive with `useMemo`; do not persist what can be computed
- Values that depend on stable props (e.g. `boardSize` from `difficulty`) are computed inside hooks via `useMemo` — module-scope constants are only appropriate when the value is truly static (e.g. `DIFFICULTY_CONFIG`, `ARROW_DELTAS`)
- Expose typed, view-ready data — not raw state slices

### `components/` — render and emit

- Receive props, render UI, emit typed callbacks
- No game rules, no direct hook calls (except the designated wiring component), no data parsing
- One component per file; file name matches exported component name
- Props interfaces in the same file unless shared across multiple consumers (→ `types/`)
- Do not create a component to solve a logic problem — extract to service/hook first

---

## State design rules

**Persist only:** shots fired, last shot result, active turn (session only).

**Derive with `useMemo`:** cell visual state, sunk status, game-over, winner, isAiThinking, shipHitCounts, status labels, shot counts.

**Atomic updates:** when two values must change together use `useReducer` — single dispatch, never two `setState` calls.

**No duplicated sources of truth.** If a value can be computed from persisted state and constants, it must be computed.

---

## Wiring components

`BattleshipGame` and `BattleshipMultiplayerGame` are the only components that call their respective hooks. Everything below receives plain props and emits callbacks. No child is aware the hook exists.

---

## Coordinate rules

- `CoordinateKey` = `${number},${number}` template literal type — not a plain string
- `toKey(col, row)` is the only legal production site
- `fromKey` is the only legal parse site — no manual `.split(",").map(Number)`
- `RawCoordinate` `[col, row]` tuples exist only in `data/` and are converted immediately on parse
- Coordinates are 0-indexed; `col` = horizontal, `row` = vertical

---

## TypeScript rules

- `any` is forbidden everywhere
- Import types with `import type` — ESLint enforces `consistent-type-imports`
- Do not use `as` assertions to paper over a type error — fix the type
- Use `satisfies` for literal type-checking without widening
- Template literal types for constrained string values

---

## Component composition rules

- Small, focused, single-responsibility components
- Do not create a component purely to reduce line count — only when it aids clarity or enables reuse
- UI primitives (`Stack`, `Button`, `VisuallyHidden`, etc.) live in `src/components/ui/` and are domain-agnostic
- Primitives accept `className` for escape-hatch overrides via `cn()`
- Interactive primitives (`Button`) forward `ref` and spread native props
- `cn()` from `lib/` for all conditional class composition — no ternaries inside className strings

---

## What to check before producing code

1. Search existing source files — do not reinvent types, utilities, or logic that already exist
2. Identify the correct layer for each piece of logic
3. Write the minimum change — do not modify unrelated files
4. Verify single responsibility: does each new function, type, or component do exactly one thing?
5. Verify no duplicated source of truth
6. Verify all four CI gates still pass: `typecheck`, `lint`, `format:check`, `test`
7. List every modified file with its relative path — complete content, no partial snippets
