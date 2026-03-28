---
name: vitest-react
description: Write correct, maintainable Vitest and Testing Library tests for React and TypeScript. Use this skill whenever writing or reviewing tests for components, hooks, services, or utilities in a Vite + React + TypeScript project. Triggers include: adding tests for a new component or hook, deciding what to test and at which layer, writing assertions for accessible names or roles, testing async hook behaviour with timers or mocks, targeting elements in a grid or list, testing keyboard interaction, or reviewing existing tests for correctness. Always consult this skill before writing any test code in this project.
---

# Vitest + React Testing Skill

This skill encodes testing strategy, patterns, and anti-patterns for this project. The stack is Vite + React + TypeScript + Vitest + Testing Library (jsdom). Read before writing any test.

---

## Testing priority — cost of a regression

Write tests in order of value, not order of ease:

1. **Domain / service layer** — highest value. Pure functions, no dependencies. A failure here means a game rule is broken. Cover every rule, every guard, every edge case.
2. **Hook layer** — `renderHook` with mocked collaborators. Covers state shape, transition logic, and side-effect coordination without mounting a full component tree.
3. **Component integration** — wiring components (`BattleshipGame`, `BattleshipMultiplayerGame`) exercised end-to-end with user interactions.
4. **Presentational components** — cover rendering, prop-driven state, and accessibility contracts. Fast and isolated.

---

## File structure

Tests mirror `src/`:

```
src/test/
  features/battleship/
    services/engine.test.ts
    hooks/useBattleshipGame.test.tsx
    components/ShipStatusList.test.tsx
  components/
    board/Board.test.tsx
    game/BattleshipGame.test.tsx
```

One test file per source file. No barrel test files.

---

## Element targeting — most important rule

**Use `data-coord` attributes for grid cell targeting. Never use `aria-label` regex patterns on grid cells.**

```ts
// Correct — unambiguous
const cell = container.querySelector('[data-coord="1,0"]');
// or via a helper:
function cellByCoord(coord: string) {
  return document.querySelector(`[data-coord="${coord}"]`) as HTMLElement;
}

// Wrong — /B1/ matches "B1, not fired" AND "B10, not fired"
screen.getByRole("button", { name: /B1/i }); // ← false match risk
```

For non-cell elements, prefer semantic queries in this order:

1. `getByRole` with `name` option (exact string or anchored regex)
2. `getByLabelText`
3. `getByText` for visible text content
4. `data-testid` as last resort — never for accessibility-relevant elements

---

## Exact strings in assertions

Use exact rendered strings, not loose patterns, when the string is deterministic:

```ts
// Correct
expect(screen.getByText("1 shot fired.")).toBeInTheDocument();
expect(screen.getByLabelText("Destroyer: 1 of 2 hit")).toBeInTheDocument();

// Wrong — masks regressions in copy
expect(screen.getByText(/shot/i)).toBeInTheDocument();
```

Anchored regex is acceptable when testing substring presence in a longer label:

```ts
expect(screen.getByRole("button", { name: /A1.*hit/i })).toBeDisabled();
```

---

## Hook testing

Use `renderHook` from `@testing-library/react`:

```ts
import { renderHook, act } from "@testing-library/react";
import { useBattleshipGame } from "@/features/battleship/hooks/useBattleshipGame";

it("increments shot count after firing", () => {
  const { result } = renderHook(() => useBattleshipGame());
  act(() => {
    result.current.fireShot(0, 0);
  });
  expect(result.current.shots.size).toBe(1);
});
```

Wrap all state-triggering calls in `act()`. Use `rerender` from `renderHook` when prop changes need testing.

---

## Async and timing — critical pattern

**Do not use `vi.useFakeTimers()` alongside `userEvent`.** They conflict. `userEvent.setup()` installs its own timing internals that break with fake timers.

**Instead:** export timing constants and override them to `0` in tests.

```ts
// In the hook / service
export const AI_SHOT_DELAY_MS = 600;

// In the test
vi.mock("@/features/battleship/hooks/useBattleshipSessionGame", async () => {
  const actual = await vi.importActual("...");
  return { ...actual, AI_SHOT_DELAY_MS: 0 };
});
```

With the delay at `0`, the `setTimeout` fires on the next microtask tick. Use `await` + `waitFor` or `findBy*` queries to wait for the result:

```ts
await waitFor(() => {
  expect(result.current.board.player.shots.size).toBe(1);
});
```

---

## Mocking non-deterministic collaborators

Mock `chooseRandomUnfiredCoordinate` to a fixed coordinate so AI-turn tests are deterministic:

```ts
vi.mock("@/features/battleship/services/ai", () => ({
  chooseRandomUnfiredCoordinate: vi.fn().mockReturnValue("5,5"),
}));
```

Use `vi.mocked()` for typed access to the mock in assertions.

---

## userEvent setup

Always use `userEvent.setup()` — not `userEvent` directly. The setup call returns an instance with proper async handling:

```ts
const user = userEvent.setup();
await user.click(cellByCoord("0,0"));
await user.keyboard("{ArrowRight}");
```

Do not mix `userEvent.setup()` instances across tests. Create a new one per test or in `beforeEach`.

---

## Testing keyboard navigation

```ts
const user = userEvent.setup();
render(<Board shots={noShots} onFire={handleFire} isGameOver={false} />);

// Tab into the grid, then use arrow keys
await user.tab();
await user.keyboard("{ArrowRight}");
expect(document.activeElement).toHaveAttribute("data-coord", "1,0");
```

For focus-after-fire tests, `requestAnimationFrame` fires synchronously in jsdom — no special handling needed.

---

## Accessibility assertions

Test what the browser exposes to AT, not CSS class names:

```ts
// Role and accessible name
expect(
  screen.getByRole("grid", { name: /Battleship board/i }),
).toBeInTheDocument();
expect(
  screen.getByRole("region", { name: /Fleet status/i }),
).toBeInTheDocument();

// Disabled state
expect(cellByCoord("0,0")).toBeDisabled();

// Accessible name on a cell
expect(cellByCoord("0,0")).toHaveAccessibleName(/A1.*hit/i);

// Live region presence
expect(screen.getByRole("status")).toBeInTheDocument();
```

Never assert on `className`, `style`, or `data-*` attributes for accessibility — these are implementation details, not contracts.

---

## What to cover in a component test

For each presentational component, cover:

- Renders without error given minimal valid props
- Each distinct visual state driven by props (hit, miss, sunk, game-over, etc.)
- Accessible name / role for each interactive element
- Callbacks are called with correct arguments on interaction
- Edge cases: empty arrays, zero counts, boundary values

For wiring components (integration tests), additionally cover:

- Full interaction flow: fire shot → state updates → UI reflects new state
- AI turn fires after player miss (vs-computer)
- Game-over condition reached and displayed
- Reset / mode switch clears state

---

## Anti-patterns to avoid

| Anti-pattern                                    | Why                                | Instead                                |
| ----------------------------------------------- | ---------------------------------- | -------------------------------------- |
| `/B1/i` regex on grid cells                     | Matches `B10`                      | Use `data-coord` attribute             |
| `vi.useFakeTimers()` with `userEvent`           | Conflicts with userEvent internals | Export and override timing constant    |
| Hardcoded `setTimeout` in tests                 | Brittle, slow                      | Override constant to `0`               |
| `getByTestId` for accessibility assertions      | Not what AT sees                   | `getByRole`, `getByLabelText`          |
| Asserting on `className` for state              | Implementation detail              | `toBeDisabled`, `toHaveAccessibleName` |
| Single shared `userEvent` instance across tests | State leaks                        | `userEvent.setup()` per test           |
| Loose regex on deterministic copy               | Masks copy regressions             | Exact string                           |
| Testing implementation (internal state shape)   | Couples tests to internals         | Test observable behaviour only         |
