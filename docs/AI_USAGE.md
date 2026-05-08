# AI Usage

This project was built with AI assistance. This document describes how that assistance was structured, what it was responsible for, and what it was not.

---

## The core principle

AI in this project operates as a capable but supervised collaborator. It generates drafts. I make decisions.

Every architectural choice (what to persist vs derive, where logic lives, how layers interact, what the test strategy is) was made before any code was written and owned throughout. AI did not design the architecture. It implemented a design that already existed as a specification.

---

## The workflow

Development followed a strict phase sequence using [`/flow:*` skills](https://github.com/ku5ic/dotfiles/tree/main/claude) - a shared Claude Code skill library maintained in dotfiles and applied across projects. The skills are invoked as slash commands inside Claude Code and encode a repeatable workflow: each phase has defined inputs, outputs, and stop conditions. The AI cannot skip a phase or proceed past an approval gate unilaterally.

```
/flow:preflight -> /flow:plan -> [approval] -> /flow:implement -> /flow:test -> /flow:review -> [approval]
```

**Preflight:** before any task, audit the existing codebase. Identify relevant types, utilities, and logic. State the delta: what needs to change and why. No code is generated in this phase.

**Plan:** produce a reviewable implementation plan covering types, function signatures, state shape, accessibility impact, and test strategy. One sentence per file to be created or modified. This plan is a checkpoint, not a suggestion. It requires explicit approval before anything is written.

**Implement:** write the approved code, one complete file at a time. No scope expansion. No reinventing what already exists.

**Test:** check every constraint before human review: architecture boundaries, TypeScript correctness, accessibility compliance, test coverage, CI simulation. If anything fails, fix it before proceeding.

**Review:** surface the implementation with decisions, tradeoffs, and deferred observations. Explicit review prompts for anything requiring human judgment.

No code was committed that had not passed this sequence. No phase was skipped.

---

## What AI was responsible for

- Drafting implementation code against an approved plan
- Drafting tests against specified coverage requirements
- Flagging potential issues during verify
- Producing first drafts of documentation

---

## What I was responsible for

- All architectural decisions
- Reviewing and approving every plan before implementation
- Reviewing every file before it was accepted
- Correcting, rejecting, or redirecting outputs that did not meet the standard
- The engineering standards document that governed every decision
- Everything that was committed

---

## Why this approach

Ad-hoc AI prompting produces inconsistent results. Without a structured workflow, it is easy to end up with code that works locally but violates the architecture, tests that pass but assert the wrong things, or documentation that describes the code rather than the reasoning behind it.

The phase sequence enforces the same discipline I would apply working with a junior engineer: no implementation before the design is agreed, no review request before verification passes, no unexplained decisions in the final output.

The result is a codebase where every file is explainable, every decision is defensible, and the AI's role was to accelerate execution, not to substitute for judgment.
