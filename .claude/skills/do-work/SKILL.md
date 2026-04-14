---
name: do-work
description: Execute a unit of work end-to-end — plan, implement, test, commit, push, and open/update a PR. Use when user says "do work", "implement this", "build this phase", "work on", or wants to go from a plan/PRD/issue to shipped code.
---

# Do Work

Execute a complete unit of work: plan it, build it, validate it, commit it.

## Workflow

### 1. Understand the task

- Read the input (issue, plan phase, PRD, or verbal description)
- If a plan file exists, identify which phase is being tackled
- Explore the codebase areas that will be affected
- Identify existing patterns to follow (services, routes, components, tests)
- If the task is ambiguous, ask the user to clarify scope before proceeding.

### 2. Plan the implementation (optional)

If the task has not already been planned, create a plan for it. If you create a plan for the task ask the user to approve the plan before implementing.

### 3. Implement (red-green-refactor)

For backend code: use red/green/refactor, one test at a time in a tracer-bullet style.

1. Write a single failing test for the smallest vertical slice of behavior
2. Run the test — confirm it fails (red)
3. Write the minimum code to make it pass (green)
4. Repeat from step 1 for the next slice of behavior
5. Refactor if needed while keeping tests green

Each test should target one thin vertical slice through the system. Do not write all tests upfront — write one, make it pass, then move to the next.

For frontend code: implement directly without TDD.

### 4. Validate

Run the feedback loops and fix any issues. Repeat until both pass cleanly.

```bash
pnpm run typecheck
pnpm run test
```

### 5. Commit

Once typecheck and tests pass, commit the work.
