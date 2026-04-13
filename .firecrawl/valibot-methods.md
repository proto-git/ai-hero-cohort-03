# Methods

Apart from [`parse`](https://valibot.dev/api/parse/) and [`safeParse`](https://valibot.dev/api/safeParse/), Valibot offers some more methods to make working with your schemas easier. In the following we distinguish between schema, object and pipeline methods.

## Schema methods

Schema methods add functionality, simplify ergonomics, and help you use schemas for validation and data extraction.

Schema methods: - [`assert`](https://valibot.dev/api/assert/),
- [`config`](https://valibot.dev/api/config/),
- [`fallback`](https://valibot.dev/api/fallback/),
- [`flatten`](https://valibot.dev/api/flatten/),
- [`getDefault`](https://valibot.dev/api/getDefault/),
- [`getDefaults`](https://valibot.dev/api/getDefaults/),
- [`getDescription`](https://valibot.dev/api/getDescription/),
- [`getFallback`](https://valibot.dev/api/getFallback/),
- [`getFallbacks`](https://valibot.dev/api/getFallbacks/),
- [`getMetadata`](https://valibot.dev/api/getMetadata/),
- [`getTitle`](https://valibot.dev/api/getTitle/),
- [`is`](https://valibot.dev/api/is/),
- [`message`](https://valibot.dev/api/message/),
- [`parse`](https://valibot.dev/api/parse/),
- [`safeParse`](https://valibot.dev/api/safeParse/),
- [`summarize`](https://valibot.dev/api/summarize/),
- [`pipe`](https://valibot.dev/api/pipe/),
- [`unwrap`](https://valibot.dev/api/unwrap/)

> For more information on [`pipe`](https://valibot.dev/api/pipe/), see the [pipelines](https://valibot.dev/guides/pipelines/) guide. For more information on validation methods, see the [parse data](https://valibot.dev/guides/parse-data/) guide. For more information on [`flatten`](https://valibot.dev/api/flatten/), see the [issues](https://valibot.dev/guides/issues/#formatting) guide.

### Fallback

If an issue occurs while validating your schema, you can catch it with [`fallback`](https://valibot.dev/api/fallback/) to return a predefined value instead.

```ts
import * as v from 'valibot';

const StringSchema = v.fallback(v.string(), 'hello');
const stringOutput = v.parse(StringSchema, 123); // 'hello'
```

## Object methods

Object methods make it easier for you to work with object schemas. They are strongly oriented towards TypeScript's utility types.

Object methods: - [`keyof`](https://valibot.dev/api/keyof/),
- [`omit`](https://valibot.dev/api/omit/),
- [`partial`](https://valibot.dev/api/partial/),
- [`pick`](https://valibot.dev/api/pick/),
- [`required`](https://valibot.dev/api/required/)

### TypeScript similarities

Like in TypeScript, you can make the values of an object optional with [`partial`](https://valibot.dev/api/partial/), make them required with [`required`](https://valibot.dev/api/required/), and even include/exclude certain values from an existing schema with [`pick`](https://valibot.dev/api/pick/) and [`omit`](https://valibot.dev/api/omit/).

```ts
import * as v from 'valibot';

// TypeScript
type Object1 = Partial<{ key1: string; key2: number }>;

// Valibot
const object1 = v.partial(v.object({ key1: v.string(), key2: v.number() }));

// TypeScript
type Object2 = Pick<Object1, 'key1'>;

// Valibot
const object2 = v.pick(object1, ['key1']);
```

## Pipeline methods

Pipeline methods modify the results of validations and transformations within a pipeline.

Pipeline methods: - [`forward`](https://valibot.dev/api/forward/)

> For more info about our pipeline feature, see the [pipelines](https://valibot.dev/guides/pipelines/) guide.

### Forward

‎ [`forward`](https://valibot.dev/api/forward/) allows you to associate an issue with a nested schema. For example, if you want to check that both password entries in a registration form match, you can use it to forward the issue to the second password field in case of an error. This allows you to display the error message in the correct place.

```ts
import * as v from 'valibot';

const RegisterSchema = v.pipe(
  v.object({
    email: v.pipe(
      v.string(),
      v.nonEmpty('Please enter your email.'),
      v.email('The email address is badly formatted.')
    ),
    password1: v.pipe(
      v.string(),
      v.nonEmpty('Please enter your password.'),
      v.minLength(8, 'Your password must have 8 characters or more.')
    ),
    password2: v.string(),
  }),
  v.forward(
    v.partialCheck(
      [['password1'], ['password2']],
      (input) => input.password1 === input.password2,
      'The two passwords do not match.'
    ),
    ['password2']
  )
);
```