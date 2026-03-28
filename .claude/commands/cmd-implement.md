# /cmd-implement

Write the code approved in `/plan`. No scope expansion — implement exactly what was planned.

Requires `/plan` to have been approved.

## Rules during implementation

- **One file at a time.** Complete each file fully before moving to the next.
- **No scope creep.** If you notice something unrelated that could be improved, note it in `/review` — do not fix it now.
- **Reuse, do not reinvent.** Import existing types, utilities, and constants. Never recreate `toKey()`, domain types, or constants that already exist.
- **`import type`** for all type-only imports.
- **No `any`.** If the type is genuinely unknown, use `unknown` with a type guard.
- **`cn()` for all conditional class composition.** No ternaries inside className strings.
- **Comments explain why, not what.** Delete obvious comments. Keep only non-obvious decisions.

## Output format

For each file, output the complete file content with its relative path as a header:

```
### src/features/battleship/services/foo.ts

[complete file content]
```

Then:

```
### src/test/features/battleship/services/foo.test.ts

[complete file content]
```

Never produce partial files, diffs, or snippets. Always the full file.

## After all files are written

Run `/verify` immediately.
