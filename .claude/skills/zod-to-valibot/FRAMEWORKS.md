# Framework Integration Migration

## React Hook Form

```bash
npm install @hookform/resolvers
# (valibot resolver is included in the package)
```

```ts
// BEFORE
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';

const schema = z.object({ email: z.string().email() });
const form = useForm({ resolver: zodResolver(schema) });

// AFTER
import { valibotResolver } from '@hookform/resolvers/valibot';
import * as v from 'valibot';

const schema = v.object({ email: v.pipe(v.string(), v.email()) });
const form = useForm({ resolver: valibotResolver(schema) });
```

## tRPC (v11+)

tRPC v11 uses Standard Schema v1, which Valibot implements natively. **No adapter change needed** — just swap the schema definitions:

```ts
// BEFORE
import { z } from 'zod';
const appRouter = router({
  getUser: publicProcedure
    .input(z.object({ id: z.string() }))
    .query(({ input }) => getUser(input.id)),
});

// AFTER
import * as v from 'valibot';
const appRouter = router({
  getUser: publicProcedure
    .input(v.object({ id: v.string() }))
    .query(({ input }) => getUser(input.id)),
});
```

## Drizzle ORM

```bash
npm install drizzle-valibot && npm uninstall drizzle-zod
```

```ts
// BEFORE
import { createSelectSchema, createInsertSchema } from 'drizzle-zod';

// AFTER
import { createSelectSchema, createInsertSchema } from 'drizzle-valibot';
```

Function signatures are identical — just change the import.

## Hono

```bash
npm install @hono/valibot-validator && npm uninstall @hono/zod-validator
```

```ts
// BEFORE
import { zValidator } from '@hono/zod-validator';
app.post('/users', zValidator('json', UserSchema), (c) => {
  const data = c.req.valid('json');
});

// AFTER
import { vValidator } from '@hono/valibot-validator';
app.post('/users', vValidator('json', UserSchema), (c) => {
  const data = c.req.valid('json');
});
```

## Remix / React Router

No adapter needed — replace validation calls directly in actions/loaders:

```ts
// BEFORE
import { z } from 'zod';
export async function action({ request }: ActionFunctionArgs) {
  const formData = await request.formData();
  const result = MySchema.safeParse(Object.fromEntries(formData));
  if (!result.success) {
    return { errors: result.error.flatten() };
  }
}

// AFTER
import * as v from 'valibot';
export async function action({ request }: ActionFunctionArgs) {
  const formData = await request.formData();
  const result = v.safeParse(MySchema, Object.fromEntries(formData));
  if (!result.success) {
    return { errors: v.flatten(result.issues) };
  }
}
```

Key differences in error handling:
- `result.error.flatten()` → `v.flatten(result.issues)` (issues are on result directly, no `.error` wrapper)
- Flattened shape changes: `{ formErrors, fieldErrors }` → `{ root, nested, other }`

## TanStack Form

Native Valibot support. Change schema definitions only — no resolver swap needed.

## Vercel AI SDK

Uses Standard Schema v1 for tool parameter validation. **No adapter change needed** — just swap schema definitions.

```ts
// BEFORE
import { z } from 'zod';
const tools = {
  weather: tool({
    parameters: z.object({ city: z.string() }),
    execute: async ({ city }) => getWeather(city),
  }),
};

// AFTER
import * as v from 'valibot';
const tools = {
  weather: tool({
    parameters: v.object({ city: v.string() }),
    execute: async ({ city }) => getWeather(city),
  }),
};
```

## Conform (form validation for Remix/Next.js)

```bash
npm install @conform-to/valibot && npm uninstall @conform-to/zod
```

```ts
// BEFORE
import { parseWithZod } from '@conform-to/zod';

// AFTER
import { parseWithValibot } from '@conform-to/valibot';
```

## Standard Schema v1 — The Interop Bridge

Both Zod v4 and Valibot v1 implement Standard Schema v1 (`standardschema.dev`). Every Valibot schema exposes a `'~standard'` property. This means:

- **Gradual migration is possible** — mix Zod and Valibot schemas in the same app if consuming libraries use Standard Schema
- Libraries that accept `StandardSchemaV1` work with both without adapters
- This is how tRPC v11 and AI SDK work with both libraries transparently

If a library in your stack accepts Standard Schema, you don't need to swap the adapter — just the schema definitions.
