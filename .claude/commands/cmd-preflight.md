# /cmd-preflight

Run this before every task. No code generation until preflight passes.

## Steps

1. **Read CLAUDE.md** at the repo root. Confirm you understand the layer contracts, coordinate rules, TypeScript constraints, and testing requirements.

2. **Search project knowledge** for types, utilities, and logic related to the task. List everything you find that is relevant — file path, exported names, and a one-line summary of what each does.

3. **Identify the correct layer** for each piece of work:
   - Pure calculation or rule → `services/`
   - State machine (reducer factory, selectors) → `engine/`
   - Coordinate manipulation → `utils/`
   - Type definition → `types/`
   - State orchestration or side effects → `hooks/`
   - Rendering or user intent → `components/`
   - Static parse of input → `data/`
   - Terminal I/O → `cli/`

4. **Check for duplication**. Does anything you are about to write already exist? List any overlapping types, utilities, or logic found in step 2. If a duplicate exists, you must reuse it — not recreate it.

5. **State the delta**. Write one sentence per file you expect to create or modify. If you cannot state it clearly, the scope is not clear enough — stop and ask.

6. **Confirm CI gates** are currently passing before any changes: `typecheck`, `lint`, `format:check`, `test`.

## Output format

```
PREFLIGHT REPORT
─────────────────
Relevant existing code:
  - src/battleship/utils/coordinates.ts — toKey, fromKey, allBoardKeys
  - src/battleship/types/index.ts — CoordinateKey, Ship, CellStatus

Correct layer for this task: services/

Duplicates found: none

Delta:
  - CREATE src/battleship/services/newThing.ts
  - MODIFY src/battleship/hooks/useBattleshipGame.ts

CI status: passing (confirm before proceeding)
─────────────────
Ready to /plan
```

Do not proceed to `/plan` or `/implement` until this report is complete.
