import z from 'zod/v4'
import { testSchemaSmartCoercion } from '../../tests/shared'

testSchemaSmartCoercion([
  {
    name: 'array - undefined',
    schema: z.array(z.boolean()),
    input: undefined,
    expected: [],
  },
  {
    name: 'optional array - undefined',
    schema: z.array(z.boolean()).optional(),
    input: undefined,
  },
  {
    name: 'array - boolean',
    schema: z.array(z.boolean()),
    input: ['true', 'off', 'invalid'],
    expected: [true, false, 'invalid'],
  },
  {
    name: 'array - object',
    schema: z.array(z.boolean()),
    input: { a: 1 },
  },
  {
    name: 'tuple - undefined',
    schema: z.tuple([z.number(), z.boolean()]),
    input: undefined,
    expected: [],
  },
  {
    name: 'optional tuple - undefined',
    schema: z.tuple([z.number(), z.boolean()]).optional(),
    input: undefined,
  },
  {
    name: 'tuple - number, boolean',
    schema: z.tuple([z.number(), z.bigint()], z.boolean()),
    input: ['123', '123', 'off', 'invalid'],
    expected: [123, 123n, false, 'invalid'],
  },
  {
    name: 'tuple - number',
    schema: z.tuple([z.number(), z.bigint()], z.boolean()),
    input: 123,
  },
  {
    name: 'tuple - without rest',
    schema: z.tuple([z.number(), z.bigint()]),
    input: ['1', '2', '3', '4'],
    expected: [1, 2n, '3', '4'],
  },
  {
    name: 'set - undefined',
    schema: z.set(z.number()),
    input: undefined,
    expected: new Set(),
  },
  {
    name: 'optional set - undefined',
    schema: z.set(z.number()).optional(),
    input: undefined,
  },
  {
    name: 'set - array boolean',
    schema: z.set(z.boolean()).optional(),
    input: ['true', 'off', 'invalid'],
    expected: new Set([true, false, 'invalid']),
  },
  {
    name: 'set - set boolean',
    schema: z.set(z.boolean()).optional(),
    input: new Set(['true', 'off', 'invalid']),
    expected: new Set([true, false, 'invalid']),
  },
  {
    name: 'set - map',
    schema: z.set(z.number()),
    input: new Map([[1, 2]]),
  },
  {
    name: 'object - undefined',
    schema: z.object({ a: z.boolean() }),
    input: undefined,
    expected: {},
  },
  {
    name: 'optional object - undefined',
    schema: z.object({ a: z.boolean() }).optional(),
    input: undefined,
  },
  {
    name: 'object - boolean',
    schema: z.object({ a: z.boolean() }),
    input: { a: 'true' },
    expected: { a: true },
  },
  {
    name: 'object - boolean with more fields than needed',
    schema: z.object({ a: z.boolean() }),
    input: { a: 'true', b: 'off' },
    expected: { a: true, b: 'off' },
  },
  {
    name: 'object - boolean with catchall',
    schema: z.object({ a: z.boolean() }).catchall(z.number()),
    input: { a: 'true', b: 'off', c: '123' },
    expected: { a: true, b: 'off', c: 123 },
  },
  {
    name: 'object - array',
    schema: z.object({ a: z.boolean() }),
    input: [3, 2, 1],
  },
  {
    name: 'record - undefined',
    schema: z.record(z.string(), z.boolean()),
    input: undefined,
    expected: {},
  },
  {
    name: 'optional record - undefined',
    schema: z.record(z.string(), z.boolean()).optional(),
    input: undefined,
  },
  {
    name: 'record - undefined',
    schema: z.record(z.string(), z.boolean()),
    input: { a: 'true', b: 'off' },
    expected: { a: true, b: false },
  },
  {
    name: 'record - big int',
    schema: z.record(z.string(), z.boolean()),
    input: 123n,
  },
  {
    name: 'map - undefined',
    schema: z.map(z.boolean(), z.number()),
    input: undefined,
    expected: new Map(),
  },
  {
    name: 'optional map - undefined',
    schema: z.map(z.boolean(), z.number()).optional(),
    input: undefined,
  },
  {
    name: 'map - array',
    schema: z.map(z.boolean(), z.number()),
    input: [['true', '1'], ['off', 2], ['invalid']],
    expected: new Map<any, any>([[true, 1], [false, 2], ['invalid', undefined]]),
  },
  {
    name: 'map - map boolean',
    schema: z.map(z.boolean(), z.number()),
    input: new Map([['true', '1'], ['off', 2], ['invalid']] as any),
    expected: new Map<any, any>([[true, 1], [false, 2], ['invalid', undefined]]),
  },
  {
    name: 'map - invalid array',
    schema: z.map(z.boolean(), z.number()),
    input: [1, 2, 3],
  },
])
