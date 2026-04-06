# /cmd-review

Present the completed implementation for human review. Surfaces decisions, tradeoffs, and anything that warrants deliberate sign-off.

Run after `/cmd-verify` passes.

## What to include

1. **Summary.** One paragraph describing what was built and why the approach is correct.

2. **Files changed.** List with relative paths — created, modified, or deleted.

3. **Key decisions.** For each non-obvious decision made during implementation:
   - What the decision was
   - What the alternatives were
   - Why this option was chosen

4. **Deferred observations.** Things noticed during implementation that are worth improving but were out of scope. Frame as future work, not current problems.

5. **Verify status.** Paste the verify report from `/cmd-verify`.

6. **Review prompts.** Specific questions for the reviewer — things Claude is uncertain about or where human judgement is explicitly needed.

## Output format

```
REVIEW
─────────────────
Summary:
  [one paragraph]

Files changed:
  CREATE src/battleship/services/foo.ts
  MODIFY src/battleship/hooks/useBattleshipGame.ts
  CREATE src/test/battleship/services/foo.test.ts

Key decisions:
  1. Used satisfies for FooResult literal — avoids widening while keeping inference
     Alternatives: explicit cast, inline type. This is the least surprising option.

  2. Exported AI_SHOT_DELAY_MS from the hook — enables test override without fake timers
     Alternatives: vi.useFakeTimers (conflicts with userEvent), hardcoded 0 in test (hides the seam).

Deferred observations:
  - ShipStatusItem pip rendering could be extracted to a SegmentedBar primitive
    when more consumers exist. Not justified by current usage.

Verify: ✓ all checks pass

Review prompts:
  - Is FooResult the right name, or should this fold into ShotResult?
  - The deferred ShipStatusItem extraction — worth doing now or genuinely premature?
─────────────────
```
