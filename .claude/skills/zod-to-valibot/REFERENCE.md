# Zod-to-Valibot Migration Reference

Comprehensive API reference for building a Zod-to-Valibot migration skill. Based on official Valibot documentation (valibot.dev) as of 2026-04.

---

## Table of Contents

1. [Core Philosophy & Architecture](#1-core-philosophy--architecture)
2. [Import Style](#2-import-style)
3. [Schema Types — Complete Mapping](#3-schema-types--complete-mapping)
4. [The Pipe System (vs Zod Chaining)](#4-the-pipe-system-vs-zod-chaining)
5. [String Validations](#5-string-validations)
6. [Number Validations](#6-number-validations)
7. [Object Schemas](#7-object-schemas)
8. [Object Manipulation: extend, merge, pick, omit, partial, required](#8-object-manipulation)
9. [Arrays & Tuples](#9-arrays--tuples)
10. [Unions, Intersections & Discriminated Unions](#10-unions-intersections--discriminated-unions)
11. [Optional, Nullable, Nullish](#11-optional-nullable-nullish)
12. [Enums & Literals](#12-enums--literals)
13. [Custom Validations & Refinements](#13-custom-validations--refinements)
14. [Transforms](#14-transforms)
15. [Error Handling](#15-error-handling)
16. [Type Inference](#16-type-inference)
17. [Async Validation](#17-async-validation)
18. [Coercion](#18-coercion)
19. [Recursive / Lazy Schemas](#19-recursive--lazy-schemas)
20. [Branding](#20-branding)
21. [Defaults & Fallbacks](#21-defaults--fallbacks)
22. [Global Configuration](#22-global-configuration)
23. [Complete Name Mapping Table](#23-complete-name-mapping-table)
24. [Bundle Size & Tree-Shaking](#24-bundle-size--tree-shaking)
25. [Migration Gotchas & Breaking Changes](#25-migration-gotchas--breaking-changes)
26. [Official Codemod](#26-official-codemod)

---

## 1. Core Philosophy & Architecture

Valibot's mental model is divided into three categories:

- **Schemas** — Define a specific data type (string, number, object, etc.). Each is an independent, importable function.
- **Methods** — Modify or use a schema (parse, safeParse, partial, pick, omit, pipe, etc.). Schema is always the first argument.
- **Actions** — Further validate or transform data within a `pipe()`. Never used standalone.

This modular design means every function is individually importable, enabling aggressive tree-shaking. You only ship the code you use.

**Key architectural difference from Zod:** Zod uses method chaining (`z.string().email().min(5)`). Valibot uses function composition via `pipe()` (`v.pipe(v.string(), v.email(), v.minLength(5))`).

---

## 2. Import Style

```ts
// Zod
import { z } from 'zod';
const Schema = z.object({ key: z.string() });

// Valibot — namespace import (recommended)
import * as v from 'valibot';
const Schema = v.object({ key: v.string() });

// Valibot — named imports (also works, better tree-shaking in some bundlers)
import { object, string, pipe, email, parse } from 'valibot';
```

---

## 3. Schema Types — Complete Mapping

### Primitive Schemas

```ts
// Zod                          // Valibot
z.string()                      v.string()
z.number()                      v.number()
z.bigint()                      v.bigint()
z.boolean()                     v.boolean()
z.date()                        v.date()
z.symbol()                      v.symbol()
z.undefined()                   v.undefined()
z.null()                        v.null()
z.void()                        v.void()
z.any()                         v.any()
z.unknown()                     v.unknown()
z.never()                       v.never()
z.nan()                         v.nan()
```

### Complex Schemas

```ts
// Zod                          // Valibot
z.object({...})                 v.object({...})           // strips unknown keys
z.array(z.string())             v.array(v.string())
z.tuple([z.string()])           v.tuple([v.string()])
z.record(z.string())            v.record(v.string(), v.string())  // key AND value schemas
z.map(z.string(), z.number())   v.map(v.string(), v.number())
z.set(z.string())               v.set(v.string())
z.promise(z.string())           v.promise(v.string())
z.function()                    v.function()
z.lazy(() => Schema)            v.lazy(() => Schema)
z.instanceof(Error)             v.instance(Error)
```

### Additional Valibot-only schemas

```ts
v.blob()            // Blob validation
v.file()            // File validation
v.custom(fn)        // Custom type guard schema
v.picklist([...])   // String literal union (Zod's z.enum())
v.enum(TsEnum)      // TypeScript enum (Zod's z.nativeEnum())
v.exactOptional()   // Optional but disallows explicit undefined
v.undefinedable()   // Allows undefined
```

---

## 4. The Pipe System (vs Zod Chaining)

This is THE fundamental difference. Zod chains methods. Valibot composes functions in a pipeline.

```ts
// Zod — method chaining
const Schema = z.string().email().endsWith('@example.com');

// Valibot — pipe composition
const Schema = v.pipe(v.string(), v.email(), v.endsWith('@example.com'));
```

A pipe:
- Must start with a schema
- Followed by up to 19 validation or transformation actions
- Actions execute in order, left to right
- By default, ALL actions run even after an issue (collects all errors)
- Set `abortPipeEarly: true` to stop at first issue

```ts
// Pipe with validation + transformation
const Schema = v.pipe(
  v.string(),
  v.trim(),           // transformation: removes whitespace
  v.email(),          // validation: must be email format
  v.endsWith('@example.com')  // validation: domain check
);
```

### Methods are also different

```ts
// Zod — methods are chained
const value = z.string().parse('foo');

// Valibot — methods take schema as first arg
const value = v.parse(v.string(), 'foo');
```

---

## 5. String Validations

```ts
// Zod                              // Valibot
z.string().min(5)                   v.pipe(v.string(), v.minLength(5))
z.string().max(10)                  v.pipe(v.string(), v.maxLength(10))
z.string().length(5)                v.pipe(v.string(), v.length(5))
z.string().email()                  v.pipe(v.string(), v.email())
z.string().url()                    v.pipe(v.string(), v.url())
z.string().uuid()                   v.pipe(v.string(), v.uuid())
z.string().cuid2()                  v.pipe(v.string(), v.cuid2())
z.string().ulid()                   v.pipe(v.string(), v.ulid())
z.string().regex(/pattern/)         v.pipe(v.string(), v.regex(/pattern/))
z.string().includes('foo')          v.pipe(v.string(), v.includes('foo'))
z.string().startsWith('foo')        v.pipe(v.string(), v.startsWith('foo'))
z.string().endsWith('foo')          v.pipe(v.string(), v.endsWith('foo'))
z.string().trim()                   v.pipe(v.string(), v.trim())
z.string().toLowerCase()            v.pipe(v.string(), v.toLowerCase())
z.string().toUpperCase()            v.pipe(v.string(), v.toUpperCase())
z.string().datetime()               v.pipe(v.string(), v.isoDateTime())
z.string().ip()                     v.pipe(v.string(), v.ip())
z.string().nonempty()               v.pipe(v.string(), v.nonEmpty())
```

### Valibot-only string validations

```ts
v.pipe(v.string(), v.base64())
v.pipe(v.string(), v.bic())           // Bank Identifier Code
v.pipe(v.string(), v.creditCard())
v.pipe(v.string(), v.decimal())
v.pipe(v.string(), v.digits())
v.pipe(v.string(), v.domain())
v.pipe(v.string(), v.emoji())
v.pipe(v.string(), v.hash(['md5', 'sha256']))
v.pipe(v.string(), v.hexColor())
v.pipe(v.string(), v.hexadecimal())
v.pipe(v.string(), v.imei())
v.pipe(v.string(), v.ipv4())
v.pipe(v.string(), v.ipv6())
v.pipe(v.string(), v.isbn())
v.pipe(v.string(), v.isoDate())
v.pipe(v.string(), v.isoTime())
v.pipe(v.string(), v.isoTimestamp())
v.pipe(v.string(), v.isoWeek())
v.pipe(v.string(), v.mac())
v.pipe(v.string(), v.nanoid())
v.pipe(v.string(), v.octal())
v.pipe(v.string(), v.slug())
v.pipe(v.string(), v.rfcEmail())      // Strict RFC email
v.pipe(v.string(), v.jwsCompact())    // JWS compact serialization
```

---

## 6. Number Validations

```ts
// Zod                              // Valibot
z.number().min(5)                   v.pipe(v.number(), v.minValue(5))
z.number().max(10)                  v.pipe(v.number(), v.maxValue(10))
z.number().gt(5)                    v.pipe(v.number(), v.gtValue(5))
z.number().gte(5)                   v.pipe(v.number(), v.minValue(5))
z.number().lt(10)                   v.pipe(v.number(), v.ltValue(10))
z.number().lte(10)                  v.pipe(v.number(), v.maxValue(10))
z.number().int()                    v.pipe(v.number(), v.integer())
z.number().positive()               v.pipe(v.number(), v.minValue(1))
z.number().nonnegative()            v.pipe(v.number(), v.minValue(0))
z.number().negative()               v.pipe(v.number(), v.maxValue(-1))
z.number().nonpositive()            v.pipe(v.number(), v.maxValue(0))
z.number().multipleOf(5)            v.pipe(v.number(), v.multipleOf(5))
z.number().finite()                 v.pipe(v.number(), v.finite())
z.number().safe()                   v.pipe(v.number(), v.safeInteger())
```

---

## 7. Object Schemas

### Basic object

```ts
// Zod
const Schema = z.object({ name: z.string(), age: z.number() });

// Valibot — strips unknown keys by default (same as Zod)
const Schema = v.object({ name: v.string(), age: v.number() });
```

### Unknown key handling

```ts
// Zod                              // Valibot
z.object({...}).passthrough()       v.looseObject({...})      // allows & keeps unknown keys
z.object({...}).strict()            v.strictObject({...})     // errors on unknown keys
z.object({...}).strip()             v.object({...})           // strips unknown keys (default)
z.object({...}).catchall(z.string()) v.objectWithRest({...}, v.string())  // validate unknown keys
```

### Cross-field validation (password match example)

```ts
// Zod
const Schema = z.object({
  password: z.string(),
  confirm: z.string(),
}).refine(data => data.password === data.confirm, {
  message: "Passwords don't match",
  path: ["confirm"],
});

// Valibot
const Schema = v.pipe(
  v.object({
    password: v.string(),
    confirm: v.string(),
  }),
  v.forward(
    v.partialCheck(
      [['password'], ['confirm']],
      (input) => input.password === input.confirm,
      "Passwords don't match."
    ),
    ['confirm']
  )
);
```

---

## 8. Object Manipulation

### Extend / Merge

```ts
// Zod
const Extended = BaseSchema.extend({ newField: z.string() });

// Valibot — use spread on .entries
const Extended = v.object({
  ...BaseSchema.entries,
  newField: v.string(),
});
```

### Merge two objects

```ts
// Zod
const Merged = Schema1.merge(Schema2);

// Valibot — spread both entries (later overrides earlier)
const Merged = v.object({
  ...Schema1.entries,
  ...Schema2.entries,
});
```

### Pick

```ts
// Zod
const Picked = Schema.pick({ name: true });

// Valibot
const Picked = v.pick(Schema, ['name']);
```

### Omit

```ts
// Zod
const Omitted = Schema.omit({ age: true });

// Valibot
const Omitted = v.omit(Schema, ['age']);
```

### Partial (all fields optional)

```ts
// Zod
const PartialSchema = Schema.partial();

// Valibot
const PartialSchema = v.partial(Schema);
```

### Partial (specific fields)

```ts
// Zod
const PartialSchema = Schema.partial({ name: true });

// Valibot
const PartialSchema = v.partial(Schema, ['name']);
```

### Required (undo partial)

```ts
// Zod
const RequiredSchema = PartialSchema.required();

// Valibot
const RequiredSchema = v.required(PartialSchema);

// Specific keys
const RequiredSchema = v.required(PartialSchema, ['name']);
```

### Keyof

```ts
// Zod
const Keys = Schema.keyof(); // z.enum(["name", "age"])

// Valibot
const Keys = v.keyof(Schema); // picklist schema of the object's keys
```

---

## 9. Arrays & Tuples

### Arrays

```ts
// Zod                                // Valibot
z.array(z.string())                   v.array(v.string())
z.array(z.string()).min(1)            v.pipe(v.array(v.string()), v.minLength(1))
z.array(z.string()).max(10)           v.pipe(v.array(v.string()), v.maxLength(10))
z.array(z.string()).length(5)         v.pipe(v.array(v.string()), v.length(5))
z.array(z.string()).nonempty()        v.pipe(v.array(v.string()), v.nonEmpty())
z.string().array()                    v.array(v.string())  // no chained shorthand
```

### Tuples

```ts
// Zod
const Schema = z.tuple([z.string(), z.number()]);

// Valibot
const Schema = v.tuple([v.string(), v.number()]);
```

### Tuple with rest

```ts
// Zod
const Schema = z.tuple([z.string()]).rest(z.number());

// Valibot
const Schema = v.tupleWithRest([v.string()], v.number());
```

### Loose and strict tuples

```ts
// Valibot-only — control unknown items
v.looseTuple([v.string()])    // allows extra items
v.strictTuple([v.string()])   // errors on extra items
v.tuple([v.string()])         // strips extra items (default)
```

### Array item actions (Valibot-only)

```ts
v.pipe(v.array(v.number()), v.everyItem((item) => item > 0))
v.pipe(v.array(v.number()), v.someItem((item) => item > 0))
v.pipe(v.array(v.number()), v.checkItems((item) => item > 0, 'Must be positive'))
v.pipe(v.array(v.number()), v.filterItems((item) => item > 0))
v.pipe(v.array(v.number()), v.mapItems((item) => item * 2))
v.pipe(v.array(v.number()), v.sortItems((a, b) => a - b))
v.pipe(v.array(v.number()), v.reduceItems((acc, item) => acc + item, 0))
v.pipe(v.array(v.number()), v.findItem((item) => item > 5))
```

---

## 10. Unions, Intersections & Discriminated Unions

### Union

```ts
// Zod
const Schema = z.union([z.string(), z.number()]);
// or shorthand:
const Schema = z.string().or(z.number());

// Valibot
const Schema = v.union([v.string(), v.number()]);
```

### Discriminated Union

```ts
// Zod
const Schema = z.discriminatedUnion('type', [
  z.object({ type: z.literal('foo'), foo: z.string() }),
  z.object({ type: z.literal('bar'), bar: z.number() }),
]);

// Valibot — uses "variant" (better name, same concept)
const Schema = v.variant('type', [
  v.object({ type: v.literal('foo'), foo: v.string() }),
  v.object({ type: v.literal('bar'), bar: v.number() }),
]);
```

`variant` is preferred over `union` for discriminated object unions — better performance, better error messages, more type safety.

### Intersection

```ts
// Zod
const Schema = z.intersection(SchemaA, SchemaB);
// or shorthand:
const Schema = SchemaA.and(SchemaB);

// Valibot
const Schema = v.intersect([SchemaA, SchemaB]);
```

For object intersections specifically, prefer merging entries (better performance):

```ts
// Valibot — preferred for objects
const Schema = v.object({
  ...SchemaA.entries,
  ...SchemaB.entries,
});
```

---

## 11. Optional, Nullable, Nullish

```ts
// Zod                              // Valibot
z.string().optional()               v.optional(v.string())         // string | undefined
z.string().nullable()               v.nullable(v.string())         // string | null
z.string().nullish()                v.nullish(v.string())          // string | null | undefined

// Unwrap
z.string().optional().unwrap()      v.unwrap(v.optional(v.string()))
```

### With defaults

```ts
// Zod
z.string().default('hello')
z.string().optional().default('hello')

// Valibot — default is part of optional/nullable/nullish
v.optional(v.string(), 'hello')           // undefined -> 'hello'
v.nullable(v.string(), 'hello')           // null -> 'hello'
v.nullish(v.string(), 'hello')            // null | undefined -> 'hello'

// Dynamic default
v.optional(v.number(), () => Date.now())
```

### nonOptional / nonNullable / nonNullish

```ts
// Zod — no direct equivalent, use unwrap or create new schema

// Valibot — removes wrapper
v.nonOptional(v.optional(v.string()))     // back to string
v.nonNullable(v.nullable(v.string()))     // back to string
v.nonNullish(v.nullish(v.string()))       // back to string
```

### exactOptional (Valibot-only)

```ts
// Allows the key to be missing, but NOT explicitly set to undefined
v.object({
  name: v.exactOptional(v.string()),  // { name?: string } but NOT { name: undefined }
});
```

---

## 12. Enums & Literals

### Enum (string union)

```ts
// Zod
const Schema = z.enum(['foo', 'bar', 'baz']);

// Valibot — uses "picklist" (Zod's enum is NOT a TS enum)
const Schema = v.picklist(['foo', 'bar', 'baz']);
```

### Native TypeScript enum

```ts
// Zod
enum Color { Red, Green, Blue }
const Schema = z.nativeEnum(Color);

// Valibot — uses "enum" (Zod's nativeEnum is Valibot's enum)
enum Color { Red, Green, Blue }
const Schema = v.enum(Color);
```

### Literal

```ts
// Zod                              // Valibot
z.literal('foo')                    v.literal('foo')
z.literal(42)                       v.literal(42)
z.literal(true)                     v.literal(true)
```

---

## 13. Custom Validations & Refinements

### Basic refine

```ts
// Zod
const Schema = z.string().refine(val => val.length > 5, 'Too short');

// Valibot — use check() in a pipe
const Schema = v.pipe(
  v.string(),
  v.check(val => val.length > 5, 'Too short')
);
```

### Object-level refine with path forwarding

```ts
// Zod
const Schema = z.object({
  a: z.number(),
  b: z.number(),
  sum: z.number(),
}).refine(data => data.a + data.b === data.sum, {
  message: 'Bad calculation',
  path: ['sum'],
});

// Valibot
const Schema = v.pipe(
  v.object({ a: v.number(), b: v.number(), sum: v.number() }),
  v.forward(
    v.check(({ a, b, sum }) => a + b === sum, 'Bad calculation'),
    ['sum']
  )
);
```

### superRefine (full issue control)

```ts
// Zod
const Schema = z.string().superRefine((val, ctx) => {
  if (val.length < 5) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: 'Too short',
    });
  }
});

// Valibot — use rawCheck
const Schema = v.pipe(
  v.string(),
  v.rawCheck(({ dataset, addIssue }) => {
    if (dataset.typed && dataset.value.length < 5) {
      addIssue({ message: 'Too short' });
    }
  })
);
```

### partialCheck (validate specific fields only)

```ts
// Valibot-only — more efficient than check for objects
// Only runs when specified paths are typed (no runtime errors)
const Schema = v.pipe(
  v.object({
    password1: v.string(),
    password2: v.string(),
  }),
  v.forward(
    v.partialCheck(
      [['password1'], ['password2']],
      (input) => input.password1 === input.password2,
      'Passwords do not match.'
    ),
    ['password2']
  )
);
```

---

## 14. Transforms

### Basic transform

```ts
// Zod
const Schema = z.string().transform(val => val.length);

// Valibot
const Schema = v.pipe(
  v.string(),
  v.transform(val => val.length)
);
```

### Built-in transforms (Valibot advantages)

```ts
v.pipe(v.string(), v.trim())            // trim whitespace
v.pipe(v.string(), v.trimStart())        // trim start
v.pipe(v.string(), v.trimEnd())          // trim end
v.pipe(v.string(), v.toLowerCase())      // to lowercase
v.pipe(v.string(), v.toUpperCase())      // to uppercase
v.pipe(v.number(), v.toMinValue(10))     // clamp minimum
v.pipe(v.number(), v.toMaxValue(100))    // clamp maximum
v.pipe(v.unknown(), v.transform(Number)) // coerce to number
```

### rawTransform (full control, like superRefine + transform)

```ts
// Zod
const Schema = z.string().transform((val, ctx) => {
  const parsed = parseFloat(val);
  if (isNaN(parsed)) {
    ctx.addIssue({ code: 'custom', message: 'Not a number' });
    return z.NEVER;
  }
  return parsed;
});

// Valibot
const Schema = v.pipe(
  v.string(),
  v.rawTransform(({ dataset, addIssue, NEVER }) => {
    const parsed = parseFloat(dataset.value);
    if (isNaN(parsed)) {
      addIssue({ message: 'Not a number' });
      return NEVER;
    }
    return parsed;
  })
);
```

---

## 15. Error Handling

### parse (throws)

```ts
// Zod
try {
  const val = z.string().parse(123);
} catch (err) {
  if (err instanceof z.ZodError) {
    console.log(err.issues);
  }
}

// Valibot
try {
  const val = v.parse(v.string(), 123);
} catch (err) {
  if (err instanceof v.ValiError) {
    console.log(err.issues);
  }
}
```

### safeParse (returns result)

```ts
// Zod
const result = z.string().safeParse(123);
if (!result.success) {
  console.log(result.error.issues);  // ZodError wraps issues
}

// Valibot
const result = v.safeParse(v.string(), 123);
if (!result.success) {
  console.log(result.issues);  // issues directly on result (no wrapper)
}
```

### Type guard

```ts
// Zod — no built-in type guard

// Valibot
if (v.is(Schema, data)) {
  // data is typed
}

// Assertion function
v.assert(Schema, data);
// data is typed after this line (throws if invalid)
```

### Flatten errors

```ts
// Zod
const formatted = result.error.flatten();
// { formErrors: string[], fieldErrors: { [key]: string[] } }

// Valibot
const flat = v.flatten<typeof Schema>(result.issues);
// { root?: string[], nested?: { [path]: string[] }, other?: string[] }
```

### Issue structure

```ts
// Valibot issue shape
{
  kind: 'schema' | 'validation' | 'transformation',
  type: string,          // e.g. 'string', 'min_length', 'email'
  input: unknown,        // the actual input value
  expected: string,      // what was expected
  received: string,      // what was received
  message: string,       // human-readable error
  requirement?: unknown, // e.g. the min length value
  path?: IssuePath,      // nested path array
  issues?: Issues,       // sub-issues (for union)
}
```

### Custom error messages

```ts
// Zod
z.string({ invalid_type_error: 'Not a string' }).min(5, { message: 'Too short' });

// Valibot — single string per schema/action
v.pipe(
  v.string('Not a string'),
  v.minLength(5, 'Too short')
);
```

### getDotPath utility

```ts
// Valibot — convert issue path to dot notation
const dotPath = v.getDotPath(issue);  // e.g. "user.address.street"
```

---

## 16. Type Inference

```ts
// Zod
type Input = z.input<typeof Schema>;
type Output = z.infer<typeof Schema>;
// or: z.output<typeof Schema>

// Valibot
type Input = v.InferInput<typeof Schema>;
type Output = v.InferOutput<typeof Schema>;
```

Note: `z.infer` maps to `v.InferOutput` (not InferInput). This is because `z.infer` returns the output/parsed type.

---

## 17. Async Validation

Valibot has dedicated async variants with the `Async` suffix.

```ts
// Zod — same API, just use async refine
const Schema = z.object({
  username: z.string().refine(async (val) => {
    return await isUsernameAvailable(val);
  }),
});
await Schema.parseAsync(data);

// Valibot — explicit async schemas and actions
const Schema = v.objectAsync({
  username: v.pipeAsync(
    v.string(),
    v.checkAsync(async (val) => await isUsernameAvailable(val))
  ),
  // Sync fields can stay sync inside async parent
  avatar: v.pipe(v.string(), v.url()),
});
const result = await v.parseAsync(Schema, data);
```

**Rule of thumb:** Start synchronous. Only switch to async variants (`objectAsync`, `pipeAsync`, `checkAsync`, etc.) for the parts that need it. Async functions can contain sync children, but NOT vice versa.

Async counterparts exist for:
- `parseAsync`, `safeParseAsync`
- `pipeAsync`
- `objectAsync`, `arrayAsync`, `tupleAsync`, `unionAsync`, `variantAsync`, `intersectAsync`
- `checkAsync`, `checkItemsAsync`
- `customAsync`
- `transformAsync`, `rawTransformAsync`, `rawCheckAsync`
- `forwardAsync`
- `optionalAsync`, `nullableAsync`, `nullishAsync`
- `partialAsync`, `requiredAsync`
- `lazyAsync`, `recordAsync`, `mapAsync`, `setAsync`
- `fallbackAsync`

---

## 18. Coercion

```ts
// Zod — coerce object
const Schema = z.coerce.number();    // auto-coerces input to number
const Schema = z.coerce.string();    // auto-coerces input to string
const Schema = z.coerce.boolean();   // auto-coerces input to boolean
const Schema = z.coerce.date();      // auto-coerces input to date

// Valibot — explicit pipe with transform (safer, more control)
const NumberSchema = v.pipe(v.unknown(), v.transform(Number));
const StringSchema = v.pipe(v.unknown(), v.transform(String));
const BooleanSchema = v.pipe(v.unknown(), v.transform(Boolean));
const DateSchema = v.pipe(v.unknown(), v.transform((input) => new Date(input as string)));
```

Valibot recommends being more specific about the input type for safety:

```ts
// Better: validate input format THEN transform
const NumberSchema = v.pipe(v.string(), v.decimal(), v.transform(Number));
```

---

## 19. Recursive / Lazy Schemas

```ts
// Zod
type Category = {
  name: string;
  children: Category[];
};
const CategorySchema: z.ZodType<Category> = z.object({
  name: z.string(),
  children: z.lazy(() => z.array(CategorySchema)),
});

// Valibot — requires explicit GenericSchema type annotation
type Category = {
  name: string;
  children: Category[];
};
const CategorySchema: v.GenericSchema<Category> = v.object({
  name: v.string(),
  children: v.array(v.lazy(() => CategorySchema)),
});
```

### Recursive with nullable

```ts
// Valibot
type BinaryTree = {
  element: string;
  left: BinaryTree | null;
  right: BinaryTree | null;
};

const BinaryTreeSchema: v.GenericSchema<BinaryTree> = v.object({
  element: v.string(),
  left: v.nullable(v.lazy(() => BinaryTreeSchema)),
  right: v.nullable(v.lazy(() => BinaryTreeSchema)),
});
```

---

## 20. Branding

```ts
// Zod
const BrandedId = z.string().uuid().brand<'UserId'>();
type UserId = z.infer<typeof BrandedId>;  // string & { __brand: 'UserId' }

// Valibot — brand action in pipe
const BrandedId = v.pipe(v.string(), v.uuid(), v.brand('UserId'));
type UserId = v.InferOutput<typeof BrandedId>;  // string & Brand<'UserId'>
```

Valibot also has `flavor()` — like brand but allows assignment from the base type:

```ts
const FlavoredId = v.pipe(v.string(), v.uuid(), v.flavor('UserId'));
// A plain string can be assigned to this type (less strict than brand)
```

---

## 21. Defaults & Fallbacks

### Defaults

```ts
// Zod
const Schema = z.string().default('hello');

// Valibot — default is the second arg of optional/nullable/nullish
const Schema = v.optional(v.string(), 'hello');
```

### Fallback (Zod's .catch())

```ts
// Zod
const Schema = z.string().catch('fallback');  // returns 'fallback' on ANY error

// Valibot
const Schema = v.fallback(v.string(), 'fallback');

// Dynamic fallback
const Schema = v.fallback(v.string(), () => generateDefault());
```

### Retrieve defaults/fallbacks

```ts
// Valibot
const defaultVal = v.getDefault(Schema);        // single schema
const defaults = v.getDefaults(ObjectSchema);    // all defaults in object
const fallbackVal = v.getFallback(Schema);       // single fallback
const fallbacks = v.getFallbacks(ObjectSchema);  // all fallbacks in object
```

---

## 22. Global Configuration

Valibot supports global configuration for error messages and validation behavior.

```ts
// Set global error message for all schemas
v.setGlobalMessage('This field is invalid.');

// Set message per schema type
v.setSchemaMessage((issue) => `Expected ${issue.expected} but got ${issue.received}`);

// Set message for specific validation
v.setSpecificMessage('email', 'Please enter a valid email.');

// Global config for abort behavior
v.setGlobalConfig({
  abortEarly: true,      // stop at first issue
  abortPipeEarly: true,  // stop pipe at first issue
  lang: 'en',            // language for i18n
});

// Clean up
v.deleteGlobalConfig();
v.deleteGlobalMessage();
v.deleteSchemaMessage();
v.deleteSpecificMessage('email');
```

---

## 23. Complete Name Mapping Table

| Zod | Valibot | Notes |
|-----|---------|-------|
| `z.string()` | `v.string()` | |
| `z.number()` | `v.number()` | |
| `z.bigint()` | `v.bigint()` | |
| `z.boolean()` | `v.boolean()` | |
| `z.date()` | `v.date()` | |
| `z.symbol()` | `v.symbol()` | |
| `z.undefined()` | `v.undefined()` | |
| `z.null()` | `v.null()` | |
| `z.void()` | `v.void()` | |
| `z.any()` | `v.any()` | |
| `z.unknown()` | `v.unknown()` | |
| `z.never()` | `v.never()` | |
| `z.nan()` | `v.nan()` | |
| `z.literal(x)` | `v.literal(x)` | |
| `z.enum([...])` | `v.picklist([...])` | Name change! |
| `z.nativeEnum(E)` | `v.enum(E)` | Name change! |
| `z.object({})` | `v.object({})` | |
| `z.array(s)` | `v.array(s)` | |
| `z.tuple([])` | `v.tuple([])` | |
| `z.record(s)` | `v.record(v.string(), s)` | Key schema required |
| `z.map(k, v)` | `v.map(k, v)` | |
| `z.set(s)` | `v.set(s)` | |
| `z.union([])` | `v.union([])` | |
| `z.discriminatedUnion(k, [])` | `v.variant(k, [])` | Name change! |
| `z.intersection(a, b)` | `v.intersect([a, b])` | Array arg |
| `.and(b)` | `v.intersect([a, b])` | |
| `.or(b)` | `v.union([a, b])` | |
| `z.lazy(fn)` | `v.lazy(fn)` | |
| `z.promise(s)` | `v.promise(s)` | |
| `z.function()` | `v.function()` | |
| `z.instanceof(C)` | `v.instance(C)` | Name change! |
| `.optional()` | `v.optional(s)` | Wrapping, not chaining |
| `.nullable()` | `v.nullable(s)` | |
| `.nullish()` | `v.nullish(s)` | |
| `.default(val)` | `v.optional(s, val)` | Combined with optional |
| `.catch(val)` | `v.fallback(s, val)` | Name change! |
| `.passthrough()` | `v.looseObject({})` | Separate schema fn |
| `.strict()` | `v.strictObject({})` | Separate schema fn |
| `.strip()` | `v.object({})` | Default behavior |
| `.catchall(s)` | `v.objectWithRest({}, s)` | Name change! |
| `.extend({})` | `v.object({...base.entries, ...})` | Spread pattern |
| `.merge(other)` | `v.object({...a.entries, ...b.entries})` | Spread pattern |
| `.pick({k: true})` | `v.pick(s, ['k'])` | Array keys |
| `.omit({k: true})` | `v.omit(s, ['k'])` | Array keys |
| `.partial()` | `v.partial(s)` | |
| `.required()` | `v.required(s)` | |
| `.keyof()` | `v.keyof(s)` | |
| `.shape` | `.entries` | Property name change |
| `.element` | `item` in tuple context | |
| `.parse(data)` | `v.parse(s, data)` | Schema as 1st arg |
| `.safeParse(data)` | `v.safeParse(s, data)` | |
| `.parseAsync(data)` | `v.parseAsync(s, data)` | |
| `.refine(fn, msg)` | `v.check(fn, msg)` in pipe | Name change! |
| `.superRefine(fn)` | `v.rawCheck(fn)` in pipe | Name change! |
| `.transform(fn)` | `v.transform(fn)` in pipe | |
| `.brand()` | `v.brand(name)` in pipe | |
| `.pipe(s)` | `v.pipe(s, ...)` | Function, not method |
| `z.coerce.number()` | `v.pipe(v.unknown(), v.transform(Number))` | Explicit |
| `.min(n)` (string) | `v.minLength(n)` in pipe | Name change! |
| `.max(n)` (string) | `v.maxLength(n)` in pipe | Name change! |
| `.min(n)` (number) | `v.minValue(n)` in pipe | Name change! |
| `.max(n)` (number) | `v.maxValue(n)` in pipe | Name change! |
| `.gt(n)` | `v.gtValue(n)` in pipe | Name change! |
| `.gte(n)` | `v.minValue(n)` in pipe | |
| `.lt(n)` | `v.ltValue(n)` in pipe | Name change! |
| `.lte(n)` | `v.maxValue(n)` in pipe | |
| `.int()` | `v.integer()` in pipe | Name change! |
| `.positive()` | `v.minValue(1)` in pipe | Explicit value |
| `.nonnegative()` | `v.minValue(0)` in pipe | Explicit value |
| `.negative()` | `v.maxValue(-1)` in pipe | Explicit value |
| `.nonpositive()` | `v.maxValue(0)` in pipe | Explicit value |
| `.safe()` | `v.safeInteger()` in pipe | Name change! |
| `.email()` | `v.email()` in pipe | |
| `.url()` | `v.url()` in pipe | |
| `.uuid()` | `v.uuid()` in pipe | |
| `.regex(r)` | `v.regex(r)` in pipe | |
| `.includes(s)` | `v.includes(s)` in pipe | |
| `.startsWith(s)` | `v.startsWith(s)` in pipe | |
| `.endsWith(s)` | `v.endsWith(s)` in pipe | |
| `.trim()` | `v.trim()` in pipe | |
| `.toLowerCase()` | `v.toLowerCase()` in pipe | |
| `.toUpperCase()` | `v.toUpperCase()` in pipe | |
| `.datetime()` | `v.isoDateTime()` in pipe | Name change! |
| `.ip()` | `v.ip()` in pipe | |
| `.nonempty()` | `v.nonEmpty()` in pipe | Name change (camelCase)! |
| `z.infer<>` | `v.InferOutput<>` | Name change! |
| `z.input<>` | `v.InferInput<>` | Name change! |

---

## 24. Bundle Size & Tree-Shaking

This is Valibot's primary advantage over Zod.

| Metric | Zod | Valibot |
|--------|-----|---------|
| Full bundle | ~57 KB (min) | ~58 KB (min) — similar total |
| Typical usage | ~57 KB (ALL code ships) | **< 1 KB** for simple schemas |
| Tree-shakeable | No (class-based, method chaining) | Yes (function-based, modular) |
| Minimum footprint | ~57 KB regardless of usage | ~700 bytes |

**Why?** Zod uses a class-based architecture with method chaining. Every method lives on the class prototype, so bundlers cannot tree-shake unused methods. When you import Zod, you get ALL of Zod.

Valibot uses standalone functions. If you only use `string()`, `email()`, and `parse()`, that is all that ships. Everything else is eliminated by tree-shaking.

**Impact:** For client-side apps, form validation libraries, and edge functions where bundle size matters, Valibot can be 10-50x smaller in practice.

---

## 25. Migration Gotchas & Breaking Changes

### 1. Chaining to piping (most common change)
Every `.method()` chain becomes a `pipe()` call. This is the single biggest refactor.

### 2. `.enum()` becomes `picklist()`
Zod's `z.enum()` creates a string union. Valibot's `v.enum()` is for TypeScript enums. Use `v.picklist()` for string unions.

### 3. `.min()` / `.max()` split by context
Zod uses `.min()` for strings, numbers, arrays, etc. Valibot differentiates:
- Strings/arrays: `minLength()` / `maxLength()`
- Numbers/dates: `minValue()` / `maxValue()`
- Sets/maps: `minSize()` / `maxSize()`

### 4. Object strict/passthrough/strip are separate schemas
Instead of modifying object behavior with methods, you pick a different schema function upfront:
- `v.object()` = strip (default)
- `v.looseObject()` = passthrough
- `v.strictObject()` = strict

### 5. `.extend()` and `.merge()` use spread
There is no `.extend()` or `.merge()` method. Use `{ ...schema.entries }` spread.

### 6. Error messages are simpler
Zod accepts `{ message, invalid_type_error, required_error }`. Valibot only accepts a single string.

### 7. `.parse()` schema is first argument
All methods take the schema as the first argument. `z.string().parse(x)` becomes `v.parse(v.string(), x)`.

### 8. `.refine()` / `.superRefine()` become pipe actions
- `.refine()` -> `v.check()` inside `v.pipe()`
- `.superRefine()` -> `v.rawCheck()` inside `v.pipe()`

### 9. `.shape` becomes `.entries`
Accessing object schema properties: `schema.shape` -> `schema.entries`.

### 10. `z.infer` -> `v.InferOutput`
Not `InferInput`. The `z.infer` type corresponds to the output/parsed type.

### 11. Record requires key schema
Zod's `z.record(valueSchema)` infers string keys. Valibot requires both: `v.record(v.string(), valueSchema)`.

### 12. No `.describe()` method chaining
Use `v.description()` inside a pipe or metadata actions.

### 13. `.transform()` must be in a pipe
Transforms don't chain. They go inside `v.pipe()`.

### 14. Async requires explicit Async variants
Zod auto-detects async refinements. Valibot requires you to use `objectAsync`, `pipeAsync`, `checkAsync`, etc. explicitly. TypeScript will catch mistakes.

### 15. `.catch()` -> `v.fallback()`
Different name, wraps the schema rather than chaining.

### 16. Discriminated unions use `variant` not `discriminatedUnion`
Shorter name, same concept.

### 17. `partial()` should be applied BEFORE `pipe()`
Applying `v.partial()` to a schema that already has a pipe can cause runtime errors. Restructure so partial is applied to the base schema.

---

## 26. Official Codemod

Valibot provides an official codemod for automated migration:

```bash
# Preview changes (dry run)
npx @valibot/zod-to-valibot src/**/* --dry

# Apply changes
npx @valibot/zod-to-valibot src/**/*
```

The codemod is still in beta and may not cover all edge cases. Complex patterns like superRefine, dynamic schemas, and some transform patterns may need manual adjustment.

---

## Quick Reference: Valibot API Categories

### Schemas (37 total)
`any`, `array`, `bigint`, `blob`, `boolean`, `custom`, `date`, `enum`, `exactOptional`, `file`, `function`, `instance`, `intersect`, `lazy`, `literal`, `looseObject`, `looseTuple`, `map`, `nan`, `never`, `nonNullable`, `nonNullish`, `nonOptional`, `null`, `nullable`, `nullish`, `number`, `object`, `objectWithRest`, `optional`, `picklist`, `promise`, `record`, `set`, `strictObject`, `strictTuple`, `string`, `symbol`, `tuple`, `tupleWithRest`, `undefined`, `undefinedable`, `union`, `unknown`, `variant`, `void`

### Methods (22 total)
`assert`, `cache`, `config`, `fallback`, `flatten`, `forward`, `getDefault`, `getDefaults`, `getDescription`, `getExamples`, `getFallback`, `getFallbacks`, `getMetadata`, `getTitle`, `is`, `keyof`, `message`, `omit`, `parse`, `parser`, `partial`, `pick`, `pipe`, `required`, `safeParse`, `safeParser`, `summarize`, `unwrap`

### Validation Actions (70+)
`base64`, `bic`, `bytes`, `check`, `checkItems`, `creditCard`, `cuid2`, `decimal`, `digits`, `domain`, `email`, `emoji`, `empty`, `endsWith`, `entries`, `everyItem`, `excludes`, `finite`, `graphemes`, `gtValue`, `hash`, `hexadecimal`, `hexColor`, `imei`, `includes`, `integer`, `ip`, `ipv4`, `ipv6`, `isbn`, `isrc`, `isoDate`, `isoDateTime`, `isoTime`, `isoTimeSecond`, `isoTimestamp`, `isoWeek`, `jwsCompact`, `length`, `ltValue`, `mac`, `mac48`, `mac64`, `maxBytes`, `maxEntries`, `maxGraphemes`, `maxLength`, `maxSize`, `maxValue`, `maxWords`, `mimeType`, `minBytes`, `minEntries`, `minGraphemes`, `minLength`, `minSize`, `minValue`, `minWords`, `multipleOf`, `nanoid`, `nonEmpty`, `notBytes`, `notEntries`, `notGraphemes`, `notLength`, `notSize`, `notValue`, `notValues`, `notWords`, `octal`, `parseJson`, `partialCheck`, `rawCheck`, `regex`, `rfcEmail`, `safeInteger`, `size`, `slug`, `someItem`, `startsWith`, `ulid`, `url`, `uuid`, `value`, `values`, `words`

### Transformation Actions (24)
`brand`, `filterItems`, `findItem`, `flavor`, `guard`, `mapItems`, `normalize`, `rawTransform`, `readonly`, `reduceItems`, `sortItems`, `stringifyJson`, `toBigint`, `toBoolean`, `toDate`, `toLowerCase`, `toMaxValue`, `toMinValue`, `toNumber`, `toString`, `toUpperCase`, `transform`, `trim`, `trimEnd`, `trimStart`

### Metadata Actions (5)
`description`, `examples`, `metadata`, `title`

### Storages (12)
`deleteGlobalConfig`, `deleteGlobalMessage`, `deleteSchemaMessage`, `deleteSpecificMessage`, `getGlobalConfig`, `getGlobalMessage`, `getSchemaMessage`, `getSpecificMessage`, `setGlobalConfig`, `setGlobalMessage`, `setSchemaMessage`, `setSpecificMessage`

### Utils (7)
`entriesFromList`, `entriesFromObjects`, `getDotPath`, `isOfKind`, `isOfType`, `isValiError`, `ValiError`
