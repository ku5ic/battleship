# /cmd-verify

Run after `/cmd-implement`. Catches violations before they reach CI.

## Checklist

### Architecture

- [ ] Every new function is in the correct layer (engine, service, hook, component, util, data, cli)
- [ ] No game rules inside components or hooks
- [ ] No React imports in `engine/`, `services/`, or `utils/`
- [ ] Engine reducers are pure `(state, action) => state` — no side effects, no async
- [ ] No `RawCoordinate` tuples escaping `data/` or `utils/`
- [ ] `toKey()` is the only site producing `CoordinateKey` strings
- [ ] Module-scope constants are not recreated inside hook bodies
- [ ] Reducers are synchronous — no async logic inside a reducer

### TypeScript

- [ ] No `any` anywhere
- [ ] All type imports use `import type`
- [ ] No `as` assertions papering over a type error
- [ ] New domain concepts have explicit types in `types/`

### Components

- [ ] No component contains game rule logic
- [ ] Props are explicitly typed — no implicit `any` from spreads
- [ ] Interactive primitives forward `ref`
- [ ] `cn()` used for all conditional class composition

### Accessibility (if interactive elements were changed)

- [ ] Interactive elements are semantic HTML (`<button>`, not `<div onClick>`)
- [ ] Every interactive element has an accessible name
- [ ] Color state is backed by a non-colour indicator
- [ ] Focus rings are visible against all backgrounds
- [ ] `requestAnimationFrame` used for post-fire focus advancement
- [ ] Live region type matches content (polite for transient, status for stable)
- [ ] Repeated announcements use `key` remount

### Tests

- [ ] Every new pure function has unit tests
- [ ] Every new component has a rendering test and interaction test
- [ ] Cell targeting uses `data-coord`, not `aria-label` regex
- [ ] Assertions use exact strings where the value is deterministic
- [ ] No `vi.useFakeTimers()` alongside `userEvent`
- [ ] Timing constants exported and overridden to `0` in tests

### CI simulation

- [ ] No TypeScript errors (`typecheck`)
- [ ] No ESLint violations (`lint`) — zero warnings allowed
- [ ] Code formatted per Prettier config (`format:check`)
- [ ] All tests pass (`test`)

## Output format

```
VERIFY REPORT
─────────────────
Architecture:    ✓ pass / ✗ FAIL — [issue]
TypeScript:      ✓ pass / ✗ FAIL — [issue]
Components:      ✓ pass / ✗ FAIL — [issue]
Accessibility:   ✓ pass / n/a
Tests:           ✓ pass / ✗ FAIL — [issue]
CI simulation:   ✓ pass / ✗ FAIL — [issue]
─────────────────
Status: READY FOR REVIEW / NEEDS FIXES
```

If any item fails, fix it before marking ready. Do not ask for review with known violations.
