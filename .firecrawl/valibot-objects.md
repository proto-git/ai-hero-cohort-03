# Objects

To validate objects with a schema, you can use [`object`](https://valibot.dev/api/object/) or [`record`](https://valibot.dev/api/record/). You use [`object`](https://valibot.dev/api/object/) for an object with a specific shape and [`record`](https://valibot.dev/api/record/) for objects with any number of uniform entries.

## Object schema

The first argument is used to define the specific structure of the object. Each entry consists of a key and a schema as the value. The entries of the input are then validated against these schemas.

```ts
import * as v from 'valibot';

const ObjectSchema = v.object({
  key1: v.string(),
  key2: v.number(),
});
```

### Loose and strict objects

The [`object`](https://valibot.dev/api/object/) schema removes unknown entries. This means that entries that you have not defined in the first argument are neither validated nor added to the output. You can change this behavior by using the [`looseObject`](https://valibot.dev/api/looseObject/) or [`strictObject`](https://valibot.dev/api/strictObject/) schema instead.

The [`looseObject`](https://valibot.dev/api/looseObject/) schema allows unknown entries and adds them to the output. The [`strictObject`](https://valibot.dev/api/strictObject/) schema forbids unknown entries and returns an issue for the first unknown entry found.

### Object with specific rest

Alternatively, you can also use the [`objectWithRest`](https://valibot.dev/api/objectWithRest/) schema to define a specific schema for unknown entries. Any entries not defined in the first argument are then validated against the schema of the second argument.

```ts
import * as v from 'valibot';

const ObjectSchema = v.objectWithRest(
  {
    key1: v.string(),
    key2: v.number(),
  },
  v.null()
);
```

### Pipeline validation

To validate the value of an entry based on another entry, you can wrap you schema with the [`check`](https://valibot.dev/api/check/) validation action in a pipeline. You can also use [`forward`](https://valibot.dev/api/forward/) to assign the issue to a specific object key in the event of an error.

> If you only want to validate specific entries, we recommend using [`partialCheck`](https://valibot.dev/api/partialCheck/) instead as [`check`](https://valibot.dev/api/check/) can only be executed if the input is fully typed.

```ts
import * as v from 'valibot';

const CalculationSchema = v.pipe(
  v.object({
    a: v.number(),
    b: v.number(),
    sum: v.number(),
  }),
  v.forward(
    v.check(({ a, b, sum }) => a + b === sum, 'The calculation is incorrect.'),
    ['sum']
  )
);
```

## Record schema

For an object with any number of uniform entries, [`record`](https://valibot.dev/api/record/) is the right choice. The schema passed as the first argument validates the keys of your record, and the schema passed as the second argument validates the values.

```ts
import * as v from 'valibot';

const RecordSchema = v.record(v.string(), v.number()); // Record<string, number>
```

### Specific record keys

Instead of [`string`](https://valibot.dev/api/string/), you can also use [`custom`](https://valibot.dev/api/custom/), [`enum`](https://valibot.dev/api/enum/), [`literal`](https://valibot.dev/api/literal/), [`picklist`](https://valibot.dev/api/picklist/) or [`union`](https://valibot.dev/api/union/) to validate the keys.

```ts
import * as v from 'valibot';

const RecordSchema = v.record(v.picklist(['key1', 'key2']), v.number()); // { key1?: number; key2?: number }
```

Note that [`record`](https://valibot.dev/api/record/) marks all literal keys as optional in this case. If you want to make them required, you can use the [`object`](https://valibot.dev/api/object/) schema with the [`entriesFromList`](https://valibot.dev/api/entriesFromList/) util instead.

```ts
import * as v from 'valibot';

const RecordSchema = v.object(v.entriesFromList(['key1', 'key2'], v.number())); // { key1: number; key2: number }
```

### Pipeline validation

To validate the value of an entry based on another entry, you can wrap you schema with the [`check`](https://valibot.dev/api/check/) validation action in a pipeline. You can also use [`forward`](https://valibot.dev/api/forward/) to assign the issue to a specific record key in the event of an error.

```ts
import * as v from 'valibot';

const CalculationSchema = v.pipe(
  v.record(v.picklist(['a', 'b', 'sum']), v.number()),
  v.forward(
    v.check(
      ({ a, b, sum }) => (a || 0) + (b || 0) === (sum || 0),
      'The calculation is incorrect.'
    ),
    ['sum']
  )
);
```