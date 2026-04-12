---
name: do-work
description: Execute a unit of work end-to-end — plan, implement, test, commit, push, and open/update a PR. Use when user says "do work", "implement this", "build this phase", "work on", or wants to go from a plan/PRD/issue to shipped code.
---

# Do Work

Execute a unit of work from planning through commit+push+PR. Follows this repo's patterns (services, tests, routes, Drizzle schema) and integrates with existing PRD/plan docs.

## Input

Accept any of:
- A GitHub issue URL or number
- A verbal description of the work
- A reference to a plan file in `./plans/` (e.g., a specific phase)
- A PRD from `./prd/`

If a plan or PRD exists for this work, read it first. If the user references a phase, focus on that phase only.

## Workflow

### 1. Understand the work

- Read the input (issue, plan phase, PRD, or verbal description)
- If a plan file exists, identify which phase is being tackled
- Explore the codebase areas that will be affected
- Identify existing patterns to follow (services, routes, components, tests)

### 2. Break into steps

Present a **numbered list** of concrete steps. Each step names:
- The file to create or modify
- What changes (e.g., "add `getStats` function", "create route at `/analytics`")
- Which repo pattern applies (service pattern, route convention, test setup)

Keep the list short and scannable — no prose paragraphs. Example:

```
1. Add `statsService.ts` — getInstructorStats() following service pattern
2. Add `statsService.test.ts` — test with createTestDb/seedBaseData
3. Add route `app/routes/analytics.tsx` — loader calls getInstructorStats
4. Update sidebar nav in `root.tsx` — add Analytics link
```

**Wait for user approval before proceeding.** Iterate if they want changes.

### 3. Implement

Execute each step sequentially. Follow repo conventions:
- **Services**: object params for multi-arg functions, explicit error handling, no `any`
- **Routes**: React Router file-based routes, loaders for data fetching
- **Schema**: edit `app/db/schema.ts`, then `pnpm db:generate` + `pnpm db:migrate`
- **Components**: Tailwind + shadcn/ui, consistent with existing UI
- **Validation**: Valibot (not Zod)

### 4. Verify

Run these checks and fix any failures before proceeding:

```bash
pnpm typecheck    # Must pass — strict mode
pnpm test         # Must pass — all existing + new tests
```

If a service file was created or modified, verify it has a `.test.ts` file with tests using `createTestDb`/`seedBaseData`.

### 5. Branch check

Ask the user: **"Create a new branch, or commit on the current branch?"**

If creating a new branch:
- Branch from current HEAD: `git checkout -b <type>/<short-name>`
- Use conventional branch names: `feat/`, `fix/`, `refactor/`

### 6. Commit, push, and PR

- **Stage** the changed files explicitly (not `git add .`)
- **Commit** with conventional prefix: `feat:`, `fix:`, `refactor:`, `chore:`
- **Push** to remote with `-u` flag if new branch
- **PR**: Create a new PR with `gh pr create`, or update an existing draft PR's description if one exists for this branch

If updating an existing draft PR, refresh the PR body to reflect the new work landed (commits, phase checkboxes if applicable).

## Conventions reference

| Area | Pattern |
|------|---------|
| Multi-arg functions | Use object parameter `(opts: { ... })` |
| Naming | camelCase everywhere |
| Error handling | Explicit try/catch, early returns, validation |
| Types | No `any` — use specific types, generics, or `unknown` |
| Test setup | `createTestDb()` + `seedBaseData(testDb)` + `vi.mock("~/db")` |
| Commit message | `type: short description` with optional body |
| Formatting | Prettier with `.prettierrc` settings |
