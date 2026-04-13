# Pipelines

For detailed validations and transformations, a schema can be wrapped in a pipeline. Especially for schema functions like [`string`](https://valibot.dev/api/string/), [`number`](https://valibot.dev/api/number/), [`date`](https://valibot.dev/api/date/), [`object`](https://valibot.dev/api/object/), and [`array`](https://valibot.dev/api/array/), this feature is useful for validating properties beyond the raw data type.

## How it works

In simple words, a pipeline is a list of schemas and actions that synchronously passes through the input data. It must always start with a schema, followed by up to 19 schemas or actions. Each schema and action can examine and modify the input. The pipeline is therefore perfect for detailed validations and transformations.

### Example

For example, the pipeline feature can be used to trim a string and make sure that it is an email that ends with a specific domain.

```ts
import * as v from 'valibot';

const EmailSchema = v.pipe(
  v.string(),
  v.trim(),
  v.email(),
  v.endsWith('@example.com')
);
```

## Validations

Pipeline validation actions examine the input and, if the input does not meet a certain condition, return an issue. If the input is valid, it is returned as the output and, if present, picked up by the next action in the pipeline.

> Whenever possible, pipelines are run completely, even if an issue has occurred, to collect all possible issues. If you want to abort the pipeline early after the first issue, you need to set the `abortPipeEarly` option to `true`. Learn more about this [here](https://valibot.dev/guides/parse-data/#configuration).

Validation actions: - [`base64`](https://valibot.dev/api/base64/),
- [`bic`](https://valibot.dev/api/bic/),
- [`bytes`](https://valibot.dev/api/bytes/),
- [`check`](https://valibot.dev/api/check/),
- [`checkItems`](https://valibot.dev/api/checkItems/),
- [`creditCard`](https://valibot.dev/api/creditCard/),
- [`cuid2`](https://valibot.dev/api/cuid2/),
- [`decimal`](https://valibot.dev/api/decimal/),
- [`digits`](https://valibot.dev/api/digits/),
- [`domain`](https://valibot.dev/api/domain/),
- [`email`](https://valibot.dev/api/email/),
- [`emoji`](https://valibot.dev/api/emoji/),
- [`empty`](https://valibot.dev/api/empty/),
- [`endsWith`](https://valibot.dev/api/endsWith/),
- [`entries`](https://valibot.dev/api/entries/),
- [`everyItem`](https://valibot.dev/api/everyItem/),
- [`excludes`](https://valibot.dev/api/excludes/),
- [`finite`](https://valibot.dev/api/finite/),
- [`graphemes`](https://valibot.dev/api/graphemes/),
- [`gtValue`](https://valibot.dev/api/gtValue/),
- [`hash`](https://valibot.dev/api/hash/),
- [`hexadecimal`](https://valibot.dev/api/hexadecimal/),
- [`hexColor`](https://valibot.dev/api/hexColor/),
- [`includes`](https://valibot.dev/api/includes/),
- [`integer`](https://valibot.dev/api/integer/),
- [`ip`](https://valibot.dev/api/ip/),
- [`ipv4`](https://valibot.dev/api/ipv4/),
- [`ipv6`](https://valibot.dev/api/ipv6/),
- [`isbn`](https://valibot.dev/api/isbn/),
- [`isrc`](https://valibot.dev/api/isrc/),
- [`isoDate`](https://valibot.dev/api/isoDate/),
- [`isoDateTime`](https://valibot.dev/api/isoDateTime/),
- [`isoTime`](https://valibot.dev/api/isoTime/),
- [`isoTimeSecond`](https://valibot.dev/api/isoTimeSecond/),
- [`isoTimestamp`](https://valibot.dev/api/isoTimestamp/),
- [`isoWeek`](https://valibot.dev/api/isoWeek/),
- [`length`](https://valibot.dev/api/length/),
- [`ltValue`](https://valibot.dev/api/ltValue/),
- [`mac`](https://valibot.dev/api/mac/),
- [`mac48`](https://valibot.dev/api/mac48/),
- [`mac64`](https://valibot.dev/api/mac64/),
- [`maxBytes`](https://valibot.dev/api/maxBytes/),
- [`maxEntries`](https://valibot.dev/api/maxEntries/),
- [`maxGraphemes`](https://valibot.dev/api/maxGraphemes/),
- [`maxLength`](https://valibot.dev/api/maxLength/),
- [`maxSize`](https://valibot.dev/api/maxSize/),
- [`maxValue`](https://valibot.dev/api/maxValue/),
- [`maxWords`](https://valibot.dev/api/maxWords/),
- [`mimeType`](https://valibot.dev/api/mimeType/),
- [`minBytes`](https://valibot.dev/api/minBytes/),
- [`minEntries`](https://valibot.dev/api/minEntries/),
- [`minGraphemes`](https://valibot.dev/api/minGraphemes/),
- [`minLength`](https://valibot.dev/api/minLength/),
- [`minSize`](https://valibot.dev/api/minSize/),
- [`minValue`](https://valibot.dev/api/minValue/),
- [`minWords`](https://valibot.dev/api/minWords/),
- [`multipleOf`](https://valibot.dev/api/multipleOf/),
- [`nanoid`](https://valibot.dev/api/nanoid/),
- [`nonEmpty`](https://valibot.dev/api/nonEmpty/),
- [`notBytes`](https://valibot.dev/api/notBytes/),
- [`notEntries`](https://valibot.dev/api/notEntries/),
- [`notGraphemes`](https://valibot.dev/api/notGraphemes/),
- [`notLength`](https://valibot.dev/api/notLength/),
- [`notSize`](https://valibot.dev/api/notSize/),
- [`notValue`](https://valibot.dev/api/notValue/),
- [`notValues`](https://valibot.dev/api/notValues/),
- [`notWords`](https://valibot.dev/api/notWords/),
- [`octal`](https://valibot.dev/api/octal/),
- [`parseJson`](https://valibot.dev/api/parseJson/),
- [`partialCheck`](https://valibot.dev/api/partialCheck/),
- [`rawCheck`](https://valibot.dev/api/rawCheck/),
- [`regex`](https://valibot.dev/api/regex/),
- [`rfcEmail`](https://valibot.dev/api/rfcEmail/),
- [`safeInteger`](https://valibot.dev/api/safeInteger/),
- [`size`](https://valibot.dev/api/size/),
- [`slug`](https://valibot.dev/api/slug/),
- [`someItem`](https://valibot.dev/api/someItem/),
- [`startsWith`](https://valibot.dev/api/startsWith/),
- [`ulid`](https://valibot.dev/api/ulid/),
- [`url`](https://valibot.dev/api/url/),
- [`uuid`](https://valibot.dev/api/uuid/),
- [`value`](https://valibot.dev/api/value/),
- [`values`](https://valibot.dev/api/values/),
- [`words`](https://valibot.dev/api/words/)

Some of these actions can be combined with different schemas. For example, [`minValue`](https://valibot.dev/api/minValue/) can be used to validate the minimum value of [`string`](https://valibot.dev/api/string/), [`number`](https://valibot.dev/api/number/), [`bigint`](https://valibot.dev/api/bigint/), and [`date`](https://valibot.dev/api/date/).

```ts
import * as v from 'valibot';

const StringSchema = v.pipe(v.string(), v.minValue('foo'));
const NumberSchema = v.pipe(v.number(), v.minValue(1234));
const BigintSchema = v.pipe(v.bigint(), v.minValue(1234n));
const DateSchema = v.pipe(v.date(), v.minValue(new Date()));
```

### Custom validation

For custom validations, [`check`](https://valibot.dev/api/check/) can be used. If the function passed as the first argument returns `false`, an issue is returned. Otherwise, the input is considered valid.

```ts
import * as v from 'valibot';
import { isValidUsername } from '~/utils';

const UsernameSchema = v.pipe(
  v.string(),
  v.check(isValidUsername, 'This username is invalid.')
);
```

> You can forward the issues of a pipeline validation to a child. See the [methods](https://valibot.dev/guides/methods/#forward) guide for more information.

## Transformations

Pipeline transformation actions allow to change the value and data type of the input data. This can be useful for example to remove spaces at the beginning or end of a string or to force a minimum or maximum value.

Transformation actions: - [`brand`](https://valibot.dev/api/brand/),
- [`filterItems`](https://valibot.dev/api/filterItems/),
- [`findItem`](https://valibot.dev/api/findItem/),
- [`flavor`](https://valibot.dev/api/flavor/),
- [`guard`](https://valibot.dev/api/guard/),
- [`mapItems`](https://valibot.dev/api/mapItems/),
- [`rawTransform`](https://valibot.dev/api/rawTransform/),
- [`readonly`](https://valibot.dev/api/readonly/),
- [`reduceItems`](https://valibot.dev/api/reduceItems/),
- [`sortItems`](https://valibot.dev/api/sortItems/),
- [`toBigint`](https://valibot.dev/api/toBigint/),
- [`toBoolean`](https://valibot.dev/api/toBoolean/),
- [`toDate`](https://valibot.dev/api/toDate/),
- [`toLowerCase`](https://valibot.dev/api/toLowerCase/),
- [`toMaxValue`](https://valibot.dev/api/toMaxValue/),
- [`toMinValue`](https://valibot.dev/api/toMinValue/),
- [`toNumber`](https://valibot.dev/api/toNumber/),
- [`toString`](https://valibot.dev/api/toString/),
- [`toUpperCase`](https://valibot.dev/api/toUpperCase/),
- [`transform`](https://valibot.dev/api/transform/),
- [`trim`](https://valibot.dev/api/trim/),
- [`trimEnd`](https://valibot.dev/api/trimEnd/),
- [`trimStart`](https://valibot.dev/api/trimStart/)

For example, the pipeline of the following schema enforces a minimum value of 10. If the input is less than 10, it is replaced with the specified minimum value.

```ts
import * as v from 'valibot';

const NumberSchema = v.pipe(v.number(), v.toMinValue(10));
```

### Custom transformation

For custom transformations, [`transform`](https://valibot.dev/api/transform/) can be used. The function passed as the first argument is called with the input data and the return value defines the output. The following transformation changes the output of the schema to `null` for any number less than 10.

```ts
import * as v from 'valibot';

const NumberSchema = v.pipe(
  v.number(),
  v.transform((input) => (input < 10 ? null : input))
);
```

## Metadata

In addition to the validation and transformation actions, a pipeline can also be used to add metadata to a schema. This can be useful when working with AI tools or for documentation purposes.

Metadata actions: - [`description`](https://valibot.dev/api/description/),
- [`metadata`](https://valibot.dev/api/metadata/),
- [`title`](https://valibot.dev/api/title/)

```ts
const UsernameSchema = v.pipe(
  v.string(),
  v.regex(/^[a-z0-9_-]{4,16}$/iu),
  v.title('Username'),
  v.description(
    'A username must be between 4 and 16 characters long and can only contain letters, numbers, underscores and hyphens.'
  )
);
```