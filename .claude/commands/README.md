# Claude Code Commands

Custom slash commands for this project. Each command is a phase in the development workflow. Run them in order.

---

## Workflow

```
/cmd-preflight → /cmd-plan → [approval] → /cmd-implement → /cmd-verify → /cmd-review → [approval]
```

Never skip a phase. Never write code before `/cmd-plan` is approved. Never ask for review before `/cmd-verify` passes.

---

## Command index

| Command          | Phase             | Purpose                                                                                                  |
| ---------------- | ----------------- | -------------------------------------------------------------------------------------------------------- |
| `/cmd-preflight` | Before everything | Audit the codebase, find existing code, confirm correct layer, state the delta                           |
| `/cmd-plan`      | Design            | Produce a reviewable implementation plan — types, functions, state shape, tests, a11y impact             |
| `/cmd-implement` | Build             | Write the approved code, one complete file at a time                                                     |
| `/cmd-verify`    | QA                | Check every constraint before human review — architecture, TypeScript, a11y, tests, CI simulation        |
| `/cmd-review`    | Handoff           | Surface the implementation with decisions, tradeoffs, deferred observations, and explicit review prompts |

---

## Individual command files

- `.claude/commands/cmd-preflight.md`
- `.claude/commands/cmd-plan.md`
- `.claude/commands/cmd-implement.md`
- `.claude/commands/cmd-verify.md`
- `.claude/commands/cmd-review.md`

---

## Aborting a phase

If new information surfaces during any phase that invalidates the plan, stop and restart from `/cmd-preflight`. Do not patch a bad plan mid-implementation.

## Out-of-scope observations

If something unrelated to the current task is noticed during `/cmd-implement`, record it under "Deferred observations" in `/cmd-review`. Do not fix it in the current change.
