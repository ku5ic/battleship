# /cmd-plan

Produce a reviewable implementation plan. No code written yet — this is the design checkpoint.

Requires `/preflight` to have run first.

## Steps

1. **Restate the task** in one sentence. If it cannot be stated in one sentence, split it.

2. **List every file** to be created or modified with its relative path and a one-line description of the change.

3. **For each new type**, state:
   - Name and shape
   - Which file it lives in
   - Why it belongs in `types/` vs inline in a component or service

4. **For each new function or hook**, state:
   - Signature (inputs and return type)
   - Which layer it belongs to and why
   - Whether it is pure
   - How it will be tested

5. **For each state change**, state:
   - What is persisted and why it cannot be derived
   - What is derived and from what
   - Whether `useReducer` or `useState` is appropriate and why

6. **For each new component**, state:
   - Props interface (names and types)
   - What it renders
   - What callbacks it emits
   - Whether it contains any logic (if yes, extract it first)

7. **Accessibility impact**. Does this change affect:
   - Interactive elements (buttons, inputs)?
   - Focus management?
   - Live regions or announcements?
   - Keyboard navigation?
     If yes, state how WCAG 2.2 AA compliance is maintained.

8. **Testing plan**. For each file changed:
   - What new tests are needed?
   - At which layer (service unit, hook, component, integration)?
   - What are the critical assertions?

9. **Risk flags**. Any tradeoffs, edge cases, or decisions that need explicit sign-off before implementation.

## Output format

```
PLAN
─────────────────
Task: [one sentence]

Files:
  CREATE src/features/battleship/services/foo.ts
    — pure function resolving X from Y
  MODIFY src/features/battleship/hooks/useBattleshipGame.ts
    — consume foo(), expose result as derived useMemo

Types:
  FooResult { outcome: "a" | "b"; coord: CoordinateKey }
    — in types/index.ts, domain concept used across service + hook

Functions:
  foo(input: Bar): FooResult
    — pure, in services/, tested with unit tests

State: no new persisted state; result derived via useMemo from shots

Accessibility: no interactive elements affected

Tests:
  src/test/features/battleship/services/foo.test.ts
    — covers: happy path, already-fired guard, boundary coords

Risk flags: none
─────────────────
Awaiting approval to /implement
```

Wait for explicit approval before proceeding to `/implement`.
