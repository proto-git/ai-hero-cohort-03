# Mental model

Valibot's mental model is mainly divided between **schemas**, **methods**, and **actions**. Since each functionality is imported as its own function, it is crucial to understand this concept as it makes working with the modular API design much easier.

> The [API reference](https://valibot.dev/api/) gives you a great overview of all schemas, methods, and actions. For each one, the corresponding reference page also lists down other related schemas, methods, and actions for better discoverability.

## Schemas

Schemas are the starting point for using Valibot. They allow you to validate **a specific data type**, like a string, object, or date. Each schema is independent. They can be reused or even nested to reflect more complex data structures.

```ts
import * as v from 'valibot';

const BookSchema = v.object({
  title: v.string(),
  numberOfPages: v.number(),
  publication: v.date(),
  tags: v.array(v.string()),
});
```

Every schema function returns an accessible object that contains all its properties. However, in most cases you don't need to access them directly. Instead, you use methods that help you modify or use a schema.

## Methods

Methods help you either **modify or use a schema**. For example, the [`parse`](https://valibot.dev/api/parse/) method helps you parse unknown data based on a schema. When you use a method, you always pass the schema as the first argument.

```ts
import * as v from 'valibot';

const BookSchema = v.object({…});

function createBook(data: unknown) {
  return v.parse(BookSchema, data);
}
```

> Most methods are used with schemas. However, there are a few exceptions, such as [`forward`](https://valibot.dev/api/forward/) and [`flatten`](https://valibot.dev/api/flatten/), which are used with actions or issues.

## Actions

Actions help you to **further validate or transform** a specific data type. They are used exclusively in conjunction with the [`pipe`](https://valibot.dev/api/pipe/) method, which extends the functionality of a schema by adding additional validation and transformation rules. For example, the following schema can be used to trim a string and check if it is a valid email address.

```ts
import * as v from 'valibot';

const EmailSchema = v.pipe(v.string(), v.trim(), v.email());
```

Actions are very powerful. There are basically no limits to what you can do with them. Besides basic validations and transformations as shown in the example above, they also allow you to modify the output type with actions like [`readonly`](https://valibot.dev/api/readonly/) and [`brand`](https://valibot.dev/api/brand/).