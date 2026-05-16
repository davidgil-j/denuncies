---
name: test-driven-development
description: Use when writing new features, fixing bugs, or changing behavior. Enforces RED-GREEN-REFACTOR cycle.
---

# Test-Driven Development (TDD)

## Core Principle

**"Write the test first. Watch it fail. Write minimal code to pass."**

If you didn't watch the test fail, you don't know if it tests the right thing.

## The Iron Law

```
NO PRODUCTION CODE WITHOUT A FAILING TEST FIRST
```

Code written before tests must be deleted and rewritten from scratch. No exceptions.

## The Cycle: RED → GREEN → REFACTOR

### RED Phase — Write the failing test

1. Write a single test demonstrating the desired behavior
2. One behavior. Clear name. Real code (no mocks unless unavoidable).
3. Test must not pass yet — it proves the feature is missing.

### Verify RED

Run the tests. Confirm it fails **for the right reason**:
- Feature missing → correct RED
- Syntax error or typo → fix the test, not the code
- Test passes immediately → the test is wrong

### GREEN Phase — Minimal implementation

1. Write the simplest possible code that makes the test pass
2. No over-engineering. No "while I'm here" additions.
3. Just enough to go green.

### Verify GREEN

- All tests pass?
- No existing tests broken?
- If yes → proceed to REFACTOR

### REFACTOR Phase — Clean up

1. Remove duplication
2. Improve naming
3. Extract helpers
4. **Do NOT introduce new behavior during refactor**
5. Tests must stay green throughout

## Always Apply TDD For

- New features
- Bug fixes (write a test that reproduces the bug first)
- Refactoring (add test coverage before changing code)
- Behavior changes

## Common Rationalizations (All Wrong)

| Excuse | Reality |
|--------|---------|
| "I'll write tests afterward" | Tests-after prove what code does, not what it should do |
| "Manual testing is enough" | Manual testing doesn't prevent regressions |
| "This is too simple to test" | Simple code breaks too. Test it. |
| "I'll adapt the pattern slightly" | Partial understanding guarantees bugs |
| "Sunk cost — I already wrote the code" | Delete it. Start with the test. |
| "Spirit of TDD, not the ritual" | Tests-first answer "what should this do?" Tests-after answer "what does this do?" |

## Why This Is Pragmatic

- Finds bugs before deployment
- Prevents regressions automatically
- Documents expected behavior
- Enables safe refactoring

## Red Flags — STOP

- Writing production code without a failing test
- Saying "I'll add tests later"
- Running tests only at the end
- Mocking everything (tests that prove nothing)

**When you catch yourself doing any of these: STOP. Write the test first.**

**Related skills:**
- `systematic-debugging` — When a test fails unexpectedly, use systematic debugging
- `verification-before-completion` — Verify the full test suite passes before claiming done
