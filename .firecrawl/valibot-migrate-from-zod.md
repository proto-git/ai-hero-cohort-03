# Migrate from Zod

Migrating from [Zod](https://zod.dev/) to Valibot is very easy in most cases since both APIs have a lot of similarities. The following guide will help you migrate step by step and also point out important differences.

## Official codemod

To make the migration as smoth as possible, we have created an official codemod that automatically migrates your Zod schemas to Valibot. Just copy your schemas into this editor and click play.

> The codemod is still in beta and may not cover all edge cases. If you encounter any problems or unexpected behaviour, please create an [issue](https://github.com/open-circle/valibot/issues/new). Alternatively, you can try to fix any issues yourself and create a [pull request](https://github.com/open-circle/valibot/pulls). You can find the source code [here](https://github.com/open-circle/valibot/tree/main/codemod/zod-to-valibot).

You can also run the codemod locally to migrate your entire codebase at once:

```bash
// Preview changes (no writes)
npx @valibot/zod-to-valibot src/**/* --dry

// Apply changes
npx @valibot/zod-to-valibot src/**/*
```

## Replace imports

The first thing to do after [installing](https://valibot.dev/guides/installation/) Valibot is to update your imports. Just change your Zod imports to Valibot's and replace all occurrences of `z.` with `v.`.

```ts
// Change this
import { z } from 'zod';
const Schema = z.object({ key: z.string() });

// To this
import * as v from 'valibot';
const Schema = v.object({ key: v.string() });
```

## Restructure code

One of the biggest differences between Zod and Valibot is the way you further validate a given type. In Zod, you chain methods like `.email` and `.endsWith`. In Valibot you use [pipelines](https://valibot.dev/guides/pipelines/) to do the same thing. This is a function that starts with a schema and is followed by up to 19 validation or transformation actions.

```ts
// Change this
const Schema = z.string().email().endsWith('@example.com');

// To this
const Schema = v.pipe(v.string(), v.email(), v.endsWith('@example.com'));
```

Due to the modular design of Valibot, also all other methods like `.parse` or `.safeParse` have to be used a little bit differently. Instead of chaining them, you usually pass the schema as the first argument and move any existing arguments one position to the right.

```ts
// Change this
const value = z.string().parse('foo');

// To this
const value = v.parse(v.string(), 'foo');
```

We recommend that you read our [mental model](https://valibot.dev/guides/mental-model/) guide to understand how the individual functions of Valibot's modular API work together.

## Change names

Most of the names are the same as in Zod. However, there are some exceptions. The following table shows all names that have changed.

| Zod | Valibot |
| --- | --- |
| `and` | [`intersect`](https://valibot.dev/api/intersect/) |
| `catch` | [`fallback`](https://valibot.dev/api/fallback/) |
| `catchall` | [`objectWithRest`](https://valibot.dev/api/objectWithRest/) |
| `coerce` | [`pipe`](https://valibot.dev/api/pipe/), [`unknown`](https://valibot.dev/api/unknown/) and [`transform`](https://valibot.dev/api/transform/) |
| `datetime` | [`isoDate`](https://valibot.dev/api/isoDate/), [`isoDateTime`](https://valibot.dev/api/isoDateTime/) |
| `default` | [`optional`](https://valibot.dev/api/optional/) |
| `discriminatedUnion` | [`variant`](https://valibot.dev/api/variant/) |
| `element` | `item` |
| `enum` | [`picklist`](https://valibot.dev/api/picklist/) |
| `extend` | [Object merging](https://valibot.dev/guides/intersections/#merge-objects) |
| `gt` | [`gtValue`](https://valibot.dev/api/gtValue/) |
| `gte` | [`minValue`](https://valibot.dev/api/minValue/) |
| `infer` | [`InferOutput`](https://valibot.dev/api/InferOutput/) |
| `int` | [`integer`](https://valibot.dev/api/integer/) |
| `input` | [`InferInput`](https://valibot.dev/api/InferInput/) |
| `instanceof` | [`instance`](https://valibot.dev/api/instance/) |
| `intersection` | [`intersect`](https://valibot.dev/api/intersect/) |
| `lt` | [`ltValue`](https://valibot.dev/api/ltValue/) |
| `lte` | [`maxValue`](https://valibot.dev/api/maxValue/) |
| `max` | [`maxLength`](https://valibot.dev/api/maxLength/), [`maxSize`](https://valibot.dev/api/maxSize/), [`maxValue`](https://valibot.dev/api/maxValue/) |
| `min` | [`minLength`](https://valibot.dev/api/minLength/), [`minSize`](https://valibot.dev/api/minSize/), [`minValue`](https://valibot.dev/api/minValue/) |
| `nativeEnum` | [`enum`](https://valibot.dev/api/enum/) |
| `negative` | [`maxValue`](https://valibot.dev/api/maxValue/) |
| `nonnegative` | [`minValue`](https://valibot.dev/api/minValue/) |
| `nonpositive` | [`maxValue`](https://valibot.dev/api/maxValue/) |
| `or` | [`union`](https://valibot.dev/api/union/) |
| `output` | [`InferOutput`](https://valibot.dev/api/InferOutput/) |
| `passthrough` | [`looseObject`](https://valibot.dev/api/looseObject/) |
| `positive` | [`minValue`](https://valibot.dev/api/minValue/) |
| `refine` | [`check`](https://valibot.dev/api/check/), [`forward`](https://valibot.dev/api/forward/) |
| `rest` | [`tuple`](https://valibot.dev/api/tuple/) |
| `safe` | [`safeInteger`](https://valibot.dev/api/safeInteger/) |
| `shape` | `entries` |
| `strict` | [`strictObject`](https://valibot.dev/api/strictObject/) |
| `strip` | [`object`](https://valibot.dev/api/object/) |
| `superRefine` | [`rawCheck`](https://valibot.dev/api/rawCheck/), [`rawTransform`](https://valibot.dev/api/rawTransform/) |

## Other details

Below are some more details that may be helpful when migrating from Zod to Valibot.

### Object and tuple

To specify whether objects or tuples should allow or prevent unknown values, Valibot uses different schema functions. Zod uses the methods `.passthrough`, `.strict`, `.strip`, `.catchall` and `.rest` instead. See the [objects](https://valibot.dev/guides/objects/) and [arrays](https://valibot.dev/guides/arrays/) guide for more details.

```ts
// Change this
const ObjectSchema = z.object({ key: z.string() }).strict();

// To this
const ObjectSchema = v.strictObject({ key: v.string() });
```

### Error messages

For individual error messages, you can pass a string or an object to Zod. It also allows you to differentiate between an error message for "required" and "invalid\_type". With Valibot you just pass a single string instead.

```ts
// Change this
const StringSchema = z
  .string({ invalid_type_error: 'Not a string' })
  .min(5, { message: 'Too short' });

// To this
const StringSchema = v.pipe(
  v.string('Not a string'),
  v.minLength(5, 'Too short')
);
```

### Coerce type

To enforce primitive values, you can use a method of the `coerce` object in Zod. There is no such object or function in Valibot. Instead, you use a pipeline with a [`transform`](https://valibot.dev/api/transform/) action as the second argument. This forces you to explicitly define the input, resulting in safer code.

```ts
// Change this
const NumberSchema = z.coerce.number();

// To this
const NumberSchema = v.pipe(v.unknown(), v.transform(Number));
```

Instead of [`unknown`](https://valibot.dev/api/unknown/) as in the previous example, we usually recommend using a specific schema such as [`string`](https://valibot.dev/api/string/) to improve type safety. This allows you, for example, to validate the formatting of the string with [`decimal`](https://valibot.dev/api/decimal/) before transforming it to a number.

```ts
const NumberSchema = v.pipe(v.string(), v.decimal(), v.transform(Number));
```

### Async validation

Similar to Zod, Valibot supports synchronous and asynchronous validation. However, the API is a little bit different. See the [async guide](https://valibot.dev/guides/async-validation/) for more details.