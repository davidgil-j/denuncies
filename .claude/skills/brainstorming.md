---
name: brainstorming
description: Use at the start of any new feature or task. Forces design approval before any implementation begins.
---

# Brainstorming

## Core Principle

**Always design before implementing**, regardless of perceived complexity.

## The Hard Gate

```
DO NOT invoke any implementation skill, write any code, scaffold any project,
or take any implementation action until you have presented a design
and the user has approved it.
```

This applies universally. **No simple-project exceptions.**

## When to Use

- Start of any new feature
- Any task that involves writing new code
- Architectural changes
- Before calling `writing-plans`

## The 9-Step Process

1. **Explore project context** — Read relevant code, understand what exists
2. **Offer visual companion** — Offer a diagram/sketch if useful (once, upfront, optional)
3. **Ask clarifying questions** — ONE question per message, sequential
4. **Propose 2-3 approaches** — Each with trade-offs clearly stated
5. **Present design sections** — Components, interfaces, data flow
6. **Write design documentation** — Capture the agreed design in writing
7. **Self-review the specification** — Check for gaps, contradictions, missing edge cases
8. **User reviews written spec** — Explicit approval required
9. **Transition to writing-plans** — Only after approval

## Rules for Clarifying Questions

- **One question per message** — Never ask multiple at once
- **Multiple-choice preferred** — Makes it easy to respond
- **Sequential** — Wait for answer before asking the next

## Design Principles

Each component in the design should:
- Have one clear purpose
- Communicate through well-defined interfaces
- Be understandable and testable independently

Avoid:
- Scope creep
- Unrelated refactoring
- "While we're at it" additions

## Terminal State

Only `writing-plans` may be invoked after brainstorming completes.

No implementation tools, no code scaffolding, no frontend design tools — until design is approved.

## Common Anti-Patterns

| Wrong | Right |
|-------|-------|
| "This is simple, let's just code it" | Even simple features have hidden assumptions |
| Asking 3 questions at once | One question, wait for answer |
| Jumping to implementation | Present design → get approval → then plan |
| Skipping documentation | Write the spec, have user approve it |
