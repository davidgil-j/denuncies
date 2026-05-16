---
name: writing-plans
description: Use after brainstorming approval to create a detailed, step-by-step implementation plan before writing code
---

# Writing Plans

## Core Principle

**"Write comprehensive implementation plans assuming the engineer has zero context and questionable taste."**

Every step must be complete enough that someone unfamiliar with the codebase can execute it independently.

## When to Use

- After `brainstorming` has produced an approved design
- Before any multi-step implementation begins
- When breaking work into tasks for subagents

## Plan File Location

Save plans to:
```
docs/superpowers/plans/YYYY-MM-DD-<feature-name>.md
```

## Before Writing Tasks

**Map the file structure first:**
- Which files will be created?
- Which files will be modified?
- What are the boundaries between components?
- Each file should have one clear responsibility

## Task Granularity

Each task = **2-5 minutes of work** following TDD:

```
Step 1: Write failing test for [behavior]
  - File: src/tests/feature.test.ts
  - Run: npm test → expect FAIL
Step 2: Implement [behavior] minimally
  - File: src/feature.ts
  - Run: npm test → expect PASS
Step 3: Commit
  - git add src/feature.ts src/tests/feature.test.ts
  - git commit -m "feat: add [behavior]"
```

## Critical Requirements — No Placeholders

Every step must contain:
- Exact file paths
- Complete code blocks (no "add validation here" or "TBD")
- Precise commands with expected output
- No vague instructions like "implement error handling"

**Banned phrases in plans:**
- "TBD"
- "implement later"
- "add appropriate handling"
- "similar to above"
- "etc."

## Plan Document Structure

```markdown
# Plan: [Feature Name]

## Goal
[One sentence: what this plan achieves]

## Architecture
[Components, their responsibilities, how they interact]

## Tech Stack
[Languages, frameworks, libraries involved]

## Tasks

### Task 1: [Name]
Files involved:
- src/...

Steps:
- [ ] 1.1 Write failing test
      ```typescript
      // exact code here
      ```
      Run: `npm test` → Expected: FAIL (feature missing)
- [ ] 1.2 Implement minimal solution
      ```typescript
      // exact code here
      ```
      Run: `npm test` → Expected: PASS
- [ ] 1.3 Commit: `git commit -m "..."`
```

## Self-Review Checklist (Before Handing Off)

1. Does each requirement from the spec map to at least one task?
2. Search for placeholder antipatterns ("TBD", "implement", "add") — fix them all
3. Are type names, method names, and file paths consistent across all tasks?

## Execution Handoff

After saving the plan, offer:
- **Subagent-driven** (recommended) — Fresh agent per task, isolated context
- **Inline execution** — Execute tasks in this conversation sequentially

## DRY / YAGNI

- Don't repeat setup steps in every task — reference them
- Don't plan for hypothetical future requirements
- Plan only what the approved design specified
