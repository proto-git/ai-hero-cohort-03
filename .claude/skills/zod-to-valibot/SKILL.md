---
name: zod-to-valibot
description: Migrate TypeScript code from Zod to Valibot schema validation. Use when user mentions migrating from Zod, switching to Valibot, replacing Zod schemas, or converting Zod validation code. Handles schema conversion, pipe() paradigm shift, framework integration updates, and type inference changes. Works across any repository.
disable-model-invocation: true
---

# Zod to Valibot Migration

## Mental model

Zod uses OOP method chaining (`z.string().email()`). Valibot uses functional composition (`v.pipe(v.string(), v.email())`). Every Zod chain becomes a `pipe()` call. Methods like `parse()` take the schema as the first argument instead of being called on the schema instance.

## Migration workflow

### Step 1 — Automated codemod (do this first)

```bash
# Install valibot
npm install valibot && npm uninstall zod
# Preview changes
npx @valibot/zod-to-valibot "src/**/*" --dry
# Apply
npx @valibot/zod-to-valibot "src/**/*"
```

The codemod handles ~95% of cases. It will NOT handle: complex `.refine()`/`.superRefine()`, dynamic schema construction, framework integration code, or custom error maps.

### Step 2 — Fix what the codemod missed

Check for TypeScript errors (`npx tsc --noEmit`) and fix manually. Common manual fixes:

1. **Refinements** — `.refine()` → `v.check()` in pipe, `.superRefine()` → `v.rawCheck()`
2. **Cross-field validation** — `.refine()` with `path` → `v.forward(v.check(...), ['field'])`
3. **Object extend/merge** — `.extend()` / `.merge()` → spread `...schema.entries`
4. **Coercion** — `z.coerce.*` → `v.pipe(v.unknown(), v.transform(...))`

See [REFERENCE.md](REFERENCE.md) for complete API mapping with before/after examples.

### Step 3 — Update framework integrations

| Framework | Change |
|-----------|--------|
| React Hook Form | `zodResolver` → `valibotResolver` from `@hookform/resolvers/valibot` |
| tRPC v11+ | No change needed (Standard Schema v1 compatible) |
| Drizzle ORM | `drizzle-zod` → `drizzle-valibot` |
| Hono | `@hono/zod-validator` → `@hono/valibot-validator` |
| Remix/React Router | Replace `z.parse()` with `v.parse(schema, data)` in actions/loaders |
| TanStack Form | Native Valibot support, no adapter needed |
| AI SDK (Vercel) | No change needed (Standard Schema v1 compatible) |

### Step 4 — Verify

```bash
npx tsc --noEmit          # Type check
npm test                   # Run tests
grep -r "from 'zod'" src/ # Confirm no Zod imports remain
```

## Critical name changes (most common mistakes)

| Zod | Valibot | Trap |
|-----|---------|------|
| `z.enum([...])` | `v.picklist([...])` | `v.enum()` is for TS enums! |
| `z.nativeEnum(E)` | `v.enum(E)` | Swapped names with above |
| `z.infer<>` | `v.InferOutput<>` | NOT InferInput |
| `.default(val)` | `v.optional(schema, val)` | Default is part of optional |
| `.catch(val)` | `v.fallback(schema, val)` | Different name |
| `z.discriminatedUnion()` | `v.variant()` | Different name |
| `.min()` / `.max()` | `v.minLength/minValue/minSize` | Split by type |
| `.passthrough()` | `v.looseObject({})` | Separate schema function |
| `.strict()` | `v.strictObject({})` | Separate schema function |
| `.refine()` | `v.check()` in pipe | + `v.forward()` for path |
| `.shape` | `.entries` | Property access |
| `z.record(valSchema)` | `v.record(v.string(), valSchema)` | Key schema required |

## When to reference deeper docs

- For the **complete 80+ API mapping table**: see [REFERENCE.md](REFERENCE.md) §23
- For **gotchas and edge cases** (25 items): see [REFERENCE.md](REFERENCE.md) §25
- For **async migration patterns**: see [REFERENCE.md](REFERENCE.md) §17
- For **error handling differences**: see [REFERENCE.md](REFERENCE.md) §15
- For **Valibot-only features** to leverage post-migration: see [REFERENCE.md](REFERENCE.md) §9 (array actions), §11 (exactOptional), §20 (flavor)
- For **framework-specific migration details**: see [FRAMEWORKS.md](FRAMEWORKS.md)
- For **gotchas, pitfalls, and patterns without 1:1 equivalents**: see [GOTCHAS.md](GOTCHAS.md)
