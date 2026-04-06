# Migration Gotchas & Edge Cases

## Patterns WITHOUT 1:1 Equivalents

### `z.coerce` — No direct equivalent
Zod auto-coerces from `unknown`. Valibot forces explicit input typing (intentionally safer):
```ts
// ZOD
const Schema = z.coerce.number();

// VALIBOT — unsafe (same behavior)
const Schema = v.pipe(v.unknown(), v.transform(Number));

// VALIBOT — safer (validate input format first)
const Schema = v.pipe(v.string(), v.decimal(), v.transform(Number));
```

### `z.ZodType<T>` — No generic constraint type
Zod allows constraining a schema to produce a specific type. Valibot uses `GenericSchema` but can't enforce "schema must produce type T" at the type level. Workaround: define the schema and verify with a type assertion:
```ts
// Verify at compile time
type _Check = v.InferOutput<typeof Schema> extends MyType ? true : never;
```

### Composing reusable action bundles — Not yet supported
You cannot create a reusable group of actions without a schema. Workaround: return a tuple and spread:
```ts
function emailActions(msg?: string) {
  return [v.email(msg), v.maxLength(255)] as const;
}
const Schema = v.pipe(v.string(), ...emailActions('Invalid email'));
```

### `z.preprocess()` — Use pipe with transform before schema
```ts
// ZOD
const Schema = z.preprocess((val) => String(val), z.string());

// VALIBOT — transform then validate
const Schema = v.pipe(v.unknown(), v.transform((val) => String(val)), v.string());
```

## Top 15 Migration Pitfalls

### 1. Method chaining muscle memory
The single most common mistake. You'll write `v.string().email()` — it's `v.pipe(v.string(), v.email())`.

### 2. `z.enum` / `v.enum` name swap
`z.enum(['a','b'])` → `v.picklist(['a','b'])`. If you write `v.enum(['a','b'])`, you'll get a confusing error because `v.enum()` expects a TypeScript enum object.

### 3. `.min()` / `.max()` split
Zod uses `.min()` for everything. Valibot differentiates:
- Strings/arrays: `v.minLength()` / `v.maxLength()`
- Numbers/dates: `v.minValue()` / `v.maxValue()`
- Sets/maps: `v.minSize()` / `v.maxSize()`

### 4. `.parse()` invocation is reversed
```ts
// ZOD:     schema.parse(data)
// VALIBOT: v.parse(schema, data)
```

### 5. `z.infer` → `v.InferOutput` (not InferInput)
`z.infer` gives the output/parsed type. The Valibot equivalent is `InferOutput`, not `InferInput`.

### 6. safeParse result shape differs
```ts
// ZOD:     result.error.issues
// VALIBOT: result.issues  (no .error wrapper)
```

### 7. Error messages are single strings
Zod accepts `{ message, invalid_type_error, required_error }`. Valibot takes one string per schema/action.

### 8. Object strictness is a schema choice, not a method
`.strict()` → use `v.strictObject()`. `.passthrough()` → use `v.looseObject()`. You can't change strictness after creation.

### 9. `.extend()` and `.merge()` don't exist
Use `v.object({ ...base.entries, newField: v.string() })`.

### 10. `.default()` lives inside `v.optional()`
```ts
// ZOD:     z.string().default('hi')
// VALIBOT: v.optional(v.string(), 'hi')
```

### 11. `v.record()` requires a key schema
```ts
// ZOD:     z.record(z.number())        — key inferred as string
// VALIBOT: v.record(v.string(), v.number())  — key schema required
```

### 12. Async requires explicit Async variants
Zod auto-detects async. Valibot requires `pipeAsync`, `checkAsync`, `objectAsync`, etc. TypeScript catches this.

### 13. The codemod leaves `.refine()` unconverted
Complex refinements (especially with `path` forwarding) need manual conversion to `v.forward(v.check(...), ['path'])`.

### 14. `partial()` before `pipe()`, not after
Applying `v.partial()` to a schema that already has a pipe can break. Apply partial to the base object schema, then wrap in pipe.

### 15. `.catch()` → `v.fallback()` (not v.catch)
There is no `v.catch()`. The equivalent is `v.fallback(schema, fallbackValue)`.

## Codemod Limitations

The official codemod (`npx @valibot/zod-to-valibot`) will NOT handle:
- Complex `.refine()` / `.superRefine()` with path forwarding
- Custom error maps (`z.setErrorMap`)
- Dynamic schema construction (schemas built with conditionals/loops)
- Zod plugins/extensions
- Framework-specific integration code (resolver imports, adapter swaps)
- `z.ZodType<T>` generic constraints
- `.describe()` chains (no direct equivalent, use `v.description()` in pipe)

Always run `npx tsc --noEmit` after the codemod and fix remaining errors manually.
