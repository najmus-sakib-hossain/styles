import z from 'zod/v4'
import { testSchemaSmartCoercion } from '../../tests/shared'

const InfiniteLazySchema = z.lazy(() => z.object({ boolean: z.boolean(), value: z.lazy(() => InfiniteLazySchema) })) as any

testSchemaSmartCoercion([
  {
    name: 'union - 123 - un-discriminated',
    schema: z.union([z.boolean(), z.number()]),
    input: '123',
  },
  {
    name: 'union - 123 - un-discriminated 2',
    schema: z.union([z.boolean(), z.number()]),
    input: { val: '123' },
  },
  {
    name: 'union - object boolean - un-discriminated',
    schema: z.union([z.object({ a: z.boolean() }), z.object({ b: z.number() })]),
    input: { a: 'true' },
  },
  {
    name: 'union - only one option',
    schema: z.union([z.boolean()]),
    input: 'true',
    expected: true,
  },
  {
    name: 'union - one discriminated',
    schema: z.union([z.object({ a: z.literal('type1'), b: z.number() }), z.object({ b: z.number() })]),
    input: { a: 'type1', b: '123' },
    expected: { a: 'type1', b: 123 },
  },
  {
    name: 'union - discriminated',
    schema: z.discriminatedUnion('a', [
      z.object({ a: z.literal('type1'), b: z.number() }),
      z.object({ a: z.literal('type2'), b: z.bigint() }),
    ]),
    input: { a: 'type2', b: '123' },
    expected: { a: 'type2', b: 123n },
  },
  {
    name: 'union - complex discriminated 1',
    schema: z.union([z.object({ a: z.object({ v: z.literal('type1') }), b: z.number() }), z.object({ a: z.literal('type2'), b: z.bigint() })]),
    input: { a: { v: 'type1' }, b: '123' },
  },
  {
    name: 'union - complex discriminated 2',
    schema: z.union([z.object({ a: z.object({ v: z.literal('type1') }), b: z.number() }), z.object({ a: z.literal('type2'), b: z.bigint() })]),
    input: { a: 'type1', b: '123' },
  },
  {
    name: 'union - complex discriminated 3',
    schema: z.union([z.object({ a: z.object({ v: z.literal('type1') }), b: z.number() }), z.object({ a: z.literal('type2'), b: z.bigint() })]),
    input: { a: { v: 'type2' }, b: '123' },
  },
  {
    name: 'union - complex discriminated 4',
    schema: z.union([z.object({ a: z.object({ v: z.literal('type1') }), b: z.number() }), z.object({ a: z.literal('type2'), b: z.bigint() })]),
    input: { a: 'type2', b: '123' },
    expected: { a: 'type2', b: 123n },
  },
  {
    name: 'union - not coerce discriminated key',
    schema: z.union([z.object({ a: z.literal(true), b: z.number() }), z.object({ a: z.literal(false), b: z.bigint() })]),
    input: { a: 'true', b: '123' },
  },
  {
    name: 'intersection - 123',
    schema: z.object({ a: z.number() }).and(z.object({ b: z.boolean() })),
    input: { a: '1234', b: 'true' },
    expected: { a: 1234, b: true },
  },
  {
    name: 'boolean - readonly',
    schema: z.boolean().readonly(),
    input: 'true',
    expected: true,
  },
  {
    name: 'pipe - boolean',
    schema: z.boolean().pipe(z.transform(() => '1')).pipe(z.string()),
    input: 'true',
    expected: true,
  },
  {
    name: 'transform - boolean',
    schema: z.boolean().transform(() => {}),
    input: 'true',
    expected: true,
  },
  {
    name: 'brand - boolean',
    schema: z.boolean().brand<'CAT'>(),
    input: 'true',
    expected: true,
  },
  {
    name: 'catch - boolean',
    schema: z.boolean().catch(false),
    input: 'true',
    expected: true,
  },
  {
    name: 'default - boolean',
    schema: z.boolean().default(false),
    input: 'true',
    expected: true,
  },
  {
    name: 'default - undefined',
    schema: z.boolean().default(false),
    input: undefined,
  },
  {
    name: 'prefault - boolean',
    schema: z.boolean().prefault(false),
    input: 'true',
    expected: true,
  },
  {
    name: 'prefault - undefined',
    schema: z.boolean().prefault(false),
    input: undefined,
  },
  {
    name: 'nullable - boolean',
    schema: z.boolean().nullable(),
    input: 'true',
    expected: true,
  },
  {
    name: 'nullable - null',
    schema: z.boolean().nullable(),
    input: null,
    expected: null,
  },
  {
    name: 'optional - boolean',
    schema: z.boolean().optional(),
    input: 'true',
    expected: true,
  },
  {
    name: 'optional - undefined',
    schema: z.boolean().optional(),
    input: undefined,
    expected: undefined,
  },
  {
    name: 'optional - non optional - undefined',
    schema: z.boolean().optional().nonoptional(),
    input: undefined,
    expected: undefined,
  },
  {
    name: 'optional - non optional - true',
    schema: z.boolean().optional().nonoptional(),
    input: 'on',
    expected: true,
  },
  {
    name: 'lazy - true',
    schema: z.lazy(() => z.object({ value: z.lazy(() => z.object({ value: z.boolean() })) })),
    input: { value: { value: 'true' } },
    expected: { value: { value: true } },
  },
  {
    name: 'lazy - invalid',
    schema: z.lazy(() => z.object({ value: z.lazy(() => z.object({ value: z.boolean() })) })),
    input: { value: { value: 'invalid' } },
  },
  {
    name: 'lazy - InfiniteLazySchema',
    schema: InfiniteLazySchema,
    input: { value: { boolean: 'true' } },
    expected: { value: { boolean: true } },
  },
])
