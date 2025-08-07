import { describe, expect, test } from 'vitest';
import { fallback, fallbackAsync } from '../../methods/index.ts';
import type { FailureDataset, InferIssue } from '../../types/index.ts';
import {
  expectNoSchemaIssueAsync,
  expectSchemaIssueAsync,
} from '../../vitest/index.ts';
import { any } from '../any/index.ts';
import { exactOptional, exactOptionalAsync } from '../exactOptional/index.ts';
import { nullish, nullishAsync } from '../nullish/index.ts';
import { number } from '../number/index.ts';
import { optional, optionalAsync } from '../optional/index.ts';
import { string } from '../string/index.ts';
import { unknown } from '../unknown/index.ts';
import { objectAsync, type ObjectSchemaAsync } from './objectAsync.ts';
import type { ObjectIssue } from './types.ts';

describe('objectAsync', () => {
  describe('should return schema object', () => {
    const entries = { key: string() };
    type Entries = typeof entries;
    const baseSchema: Omit<ObjectSchemaAsync<Entries, never>, 'message'> = {
      kind: 'schema',
      type: 'object',
      reference: objectAsync,
      expects: 'Object',
      entries,
      async: true,
      '~standard': {
        version: 1,
        vendor: 'valibot',
        validate: expect.any(Function),
      },
      '~run': expect.any(Function),
    };

    test('with undefined message', () => {
      const schema: ObjectSchemaAsync<Entries, undefined> = {
        ...baseSchema,
        message: undefined,
      };
      expect(objectAsync(entries)).toStrictEqual(schema);
      expect(objectAsync(entries, undefined)).toStrictEqual(schema);
    });

    test('with string message', () => {
      expect(objectAsync(entries, 'message')).toStrictEqual({
        ...baseSchema,
        message: 'message',
      } satisfies ObjectSchemaAsync<Entries, 'message'>);
    });

    test('with function message', () => {
      const message = () => 'message';
      expect(objectAsync(entries, message)).toStrictEqual({
        ...baseSchema,
        message,
      } satisfies ObjectSchemaAsync<Entries, typeof message>);
    });
  });

  describe('should return dataset without issues', () => {
    test('for empty object', async () => {
      await expectNoSchemaIssueAsync(objectAsync({}), [{}]);
    });

    test('for simple object', async () => {
      await expectNoSchemaIssueAsync(
        objectAsync({ key1: string(), key2: number() }),
        [{ key1: 'foo', key2: 123 }]
      );
    });

    test('for unknown entries', async () => {
      expect(
        await objectAsync({ key1: string() })['~run'](
          { value: { key1: 'foo', key2: 123, key3: null } },
          {}
        )
      ).toStrictEqual({
        typed: true,
        value: { key1: 'foo' },
      });
    });
  });

  describe('should return dataset with issues', () => {
    const schema = objectAsync({}, 'message');
    const baseIssue: Omit<ObjectIssue, 'input' | 'received'> = {
      kind: 'schema',
      type: 'object',
      expected: 'Object',
      message: 'message',
    };

    // Primitive types

    test('for bigints', async () => {
      await expectSchemaIssueAsync(schema, baseIssue, [-1n, 0n, 123n]);
    });

    test('for booleans', async () => {
      await expectSchemaIssueAsync(schema, baseIssue, [true, false]);
    });

    test('for null', async () => {
      await expectSchemaIssueAsync(schema, baseIssue, [null]);
    });

    test('for numbers', async () => {
      await expectSchemaIssueAsync(schema, baseIssue, [-1, 0, 123, 45.67]);
    });

    test('for undefined', async () => {
      await expectSchemaIssueAsync(schema, baseIssue, [undefined]);
    });

    test('for strings', async () => {
      await expectSchemaIssueAsync(schema, baseIssue, ['', 'abc', '123']);
    });

    test('for symbols', async () => {
      await expectSchemaIssueAsync(schema, baseIssue, [
        Symbol(),
        Symbol('foo'),
      ]);
    });

    // Complex types

    // TODO: Enable this test again in case we find a reliable way to check for
    // plain objects
    // test('for arrays', async () => {
    //   await expectSchemaIssueAsync(schema, baseIssue, [[], ['value']]);
    // });

    test('for functions', async () => {
      await expectSchemaIssueAsync(schema, baseIssue, [
        // eslint-disable-next-line @typescript-eslint/no-empty-function
        () => {},
        // eslint-disable-next-line @typescript-eslint/no-empty-function
        function () {},
      ]);
    });
  });

  describe('should return dataset without nested issues', () => {
    test('for simple object', async () => {
      await expectNoSchemaIssueAsync(
        objectAsync({ key1: string(), key2: number() }),
        [{ key1: 'foo', key2: 123 }]
      );
    });

    test('for nested object', async () => {
      await expectNoSchemaIssueAsync(
        objectAsync({ nested: objectAsync({ key: string() }) }),
        [{ nested: { key: 'foo' } }]
      );
    });

    test('for missing entries with fallback', async () => {
      expect(
        await objectAsync({
          key1: fallback(string(), 'foo'),
          key2: fallback(number(), () => 123),
          key3: fallbackAsync(string(), 'bar'),
          key4: fallbackAsync(number(), () => 456),
          key5: fallbackAsync(string(), async () => 'baz'),
        })['~run']({ value: {} }, {})
      ).toStrictEqual({
        typed: true,
        value: { key1: 'foo', key2: 123, key3: 'bar', key4: 456, key5: 'baz' },
      });
    });

    test('for exact optional entry', async () => {
      await expectNoSchemaIssueAsync(
        objectAsync({ key: exactOptional(string()) }),
        [{}, { key: 'foo' }]
      );
      await expectNoSchemaIssueAsync(
        objectAsync({ key: exactOptionalAsync(string()) }),
        [{}, { key: 'foo' }]
      );
    });

    test('for exact optional entry with default', async () => {
      // Sync
      expect(
        await objectAsync({ key: exactOptional(string(), 'foo') })['~run'](
          { value: {} },
          {}
        )
      ).toStrictEqual({
        typed: true,
        value: { key: 'foo' },
      });
      expect(
        await objectAsync({ key: exactOptional(string(), () => 'foo') })[
          '~run'
        ]({ value: {} }, {})
      ).toStrictEqual({
        typed: true,
        value: { key: 'foo' },
      });

      // Async
      expect(
        await objectAsync({ key: exactOptionalAsync(string(), 'foo') })['~run'](
          { value: {} },
          {}
        )
      ).toStrictEqual({
        typed: true,
        value: { key: 'foo' },
      });
      expect(
        await objectAsync({ key: exactOptionalAsync(string(), () => 'foo') })[
          '~run'
        ]({ value: {} }, {})
      ).toStrictEqual({
        typed: true,
        value: { key: 'foo' },
      });
    });

    test('for optional entry', async () => {
      await expectNoSchemaIssueAsync(objectAsync({ key: optional(string()) }), [
        {},
        { key: undefined },
        { key: 'foo' },
      ]);
      await expectNoSchemaIssueAsync(
        objectAsync({ key: optionalAsync(string()) }),
        [{}, { key: undefined }, { key: 'foo' }]
      );
    });

    test('for optional entry with default', async () => {
      // Sync
      expect(
        await objectAsync({ key: optional(string(), 'foo') })['~run'](
          { value: {} },
          {}
        )
      ).toStrictEqual({
        typed: true,
        value: { key: 'foo' },
      });
      expect(
        await objectAsync({ key: optional(string(), () => 'foo') })['~run'](
          { value: {} },
          {}
        )
      ).toStrictEqual({
        typed: true,
        value: { key: 'foo' },
      });
      expect(
        await objectAsync({
          key: optional(string(), () => undefined),
        })['~run']({ value: {} }, {})
      ).toStrictEqual({
        typed: true,
        value: { key: undefined },
      });

      // Async
      expect(
        await objectAsync({ key: optionalAsync(string(), 'foo') })['~run'](
          { value: {} },
          {}
        )
      ).toStrictEqual({
        typed: true,
        value: { key: 'foo' },
      });
      expect(
        await objectAsync({ key: optionalAsync(string(), () => 'foo') })[
          '~run'
        ]({ value: {} }, {})
      ).toStrictEqual({
        typed: true,
        value: { key: 'foo' },
      });
      expect(
        await objectAsync({
          key: optionalAsync(string(), () => undefined),
        })['~run']({ value: {} }, {})
      ).toStrictEqual({
        typed: true,
        value: { key: undefined },
      });
      expect(
        await objectAsync({ key: optionalAsync(string(), async () => 'foo') })[
          '~run'
        ]({ value: {} }, {})
      ).toStrictEqual({
        typed: true,
        value: { key: 'foo' },
      });
      expect(
        await objectAsync({
          key: optionalAsync(string(), async () => undefined),
        })['~run']({ value: {} }, {})
      ).toStrictEqual({
        typed: true,
        value: { key: undefined },
      });
    });

    test('for nullish entry', async () => {
      await expectNoSchemaIssueAsync(objectAsync({ key: nullish(number()) }), [
        {},
        { key: undefined },
        { key: null },
        { key: 123 },
      ]);
      await expectNoSchemaIssueAsync(
        objectAsync({ key: nullishAsync(number()) }),
        [{}, { key: undefined }, { key: null }, { key: 123 }]
      );
    });

    test('for nullish entry with default', async () => {
      // Sync
      expect(
        await objectAsync({ key: nullish(string(), 'foo') })['~run'](
          { value: {} },
          {}
        )
      ).toStrictEqual({
        typed: true,
        value: { key: 'foo' },
      });
      expect(
        await objectAsync({ key: nullish(string(), null) })['~run'](
          { value: {} },
          {}
        )
      ).toStrictEqual({
        typed: true,
        value: { key: null },
      });
      expect(
        await objectAsync({ key: nullish(string(), () => 'foo') })['~run'](
          { value: {} },
          {}
        )
      ).toStrictEqual({
        typed: true,
        value: { key: 'foo' },
      });
      expect(
        await objectAsync({ key: nullish(string(), () => null) })['~run'](
          { value: {} },
          {}
        )
      ).toStrictEqual({
        typed: true,
        value: { key: null },
      });
      expect(
        await objectAsync({ key: nullish(string(), () => undefined) })['~run'](
          { value: {} },
          {}
        )
      ).toStrictEqual({
        typed: true,
        value: { key: undefined },
      });

      // Async
      expect(
        await objectAsync({ key: nullishAsync(string(), 'foo') })['~run'](
          { value: {} },
          {}
        )
      ).toStrictEqual({
        typed: true,
        value: { key: 'foo' },
      });
      expect(
        await objectAsync({ key: nullishAsync(string(), null) })['~run'](
          { value: {} },
          {}
        )
      ).toStrictEqual({
        typed: true,
        value: { key: null },
      });
      expect(
        await objectAsync({ key: nullishAsync(string(), () => 'foo') })['~run'](
          { value: {} },
          {}
        )
      ).toStrictEqual({
        typed: true,
        value: { key: 'foo' },
      });
      expect(
        await objectAsync({ key: nullishAsync(string(), () => null) })['~run'](
          { value: {} },
          {}
        )
      ).toStrictEqual({
        typed: true,
        value: { key: null },
      });
      expect(
        await objectAsync({ key: nullishAsync(string(), () => undefined) })[
          '~run'
        ]({ value: {} }, {})
      ).toStrictEqual({
        typed: true,
        value: { key: undefined },
      });
      expect(
        await objectAsync({ key: nullishAsync(string(), async () => 'foo') })[
          '~run'
        ]({ value: {} }, {})
      ).toStrictEqual({
        typed: true,
        value: { key: 'foo' },
      });
      expect(
        await objectAsync({ key: nullishAsync(string(), async () => null) })[
          '~run'
        ]({ value: {} }, {})
      ).toStrictEqual({
        typed: true,
        value: { key: null },
      });
      expect(
        await objectAsync({
          key: nullishAsync(string(), async () => undefined),
        })['~run']({ value: {} }, {})
      ).toStrictEqual({
        typed: true,
        value: { key: undefined },
      });
    });

    test('for unknown entries', async () => {
      expect(
        await objectAsync({ key1: string() })['~run'](
          { value: { key1: 'foo', key2: 123, key3: null } },
          {}
        )
      ).toStrictEqual({
        typed: true,
        value: { key1: 'foo' },
      });
    });
  });

  describe('should return dataset with nested issues', () => {
    const schema = objectAsync({
      key1: string(),
      key2: number(),
      nested: objectAsync({ key1: string(), key2: number() }),
    });

    const baseInfo = {
      message: expect.any(String),
      requirement: undefined,
      issues: undefined,
      lang: undefined,
      abortEarly: undefined,
      abortPipeEarly: undefined,
    };

    test('for missing entries', async () => {
      const input = { key2: 123 };
      expect(await schema['~run']({ value: input }, {})).toStrictEqual({
        typed: false,
        value: input,
        issues: [
          {
            ...baseInfo,
            kind: 'schema',
            type: 'object',
            input: undefined,
            expected: '"key1"',
            received: 'undefined',
            path: [
              {
                type: 'object',
                origin: 'key',
                input,
                key: 'key1',
                value: undefined,
              },
            ],
          },
          {
            ...baseInfo,
            kind: 'schema',
            type: 'object',
            input: undefined,
            expected: '"nested"',
            received: 'undefined',
            path: [
              {
                type: 'object',
                origin: 'key',
                input,
                key: 'nested',
                value: undefined,
              },
            ],
          },
        ],
      } satisfies FailureDataset<InferIssue<typeof schema>>);
    });

    test('for missing nested entries', async () => {
      const input = { key1: 'value', nested: {} };
      expect(await schema['~run']({ value: input }, {})).toStrictEqual({
        typed: false,
        value: input,
        issues: [
          {
            ...baseInfo,
            kind: 'schema',
            type: 'object',
            input: undefined,
            expected: '"key2"',
            received: 'undefined',
            path: [
              {
                type: 'object',
                origin: 'key',
                input,
                key: 'key2',
                value: undefined,
              },
            ],
          },
          {
            ...baseInfo,
            kind: 'schema',
            type: 'object',
            input: undefined,
            expected: '"key1"',
            received: 'undefined',
            path: [
              {
                type: 'object',
                origin: 'value',
                input,
                key: 'nested',
                value: {},
              },
              {
                type: 'object',
                origin: 'key',
                input: input.nested,
                key: 'key1',
                value: undefined,
              },
            ],
          },
          {
            ...baseInfo,
            kind: 'schema',
            type: 'object',
            input: undefined,
            expected: '"key2"',
            received: 'undefined',
            path: [
              {
                type: 'object',
                origin: 'value',
                input,
                key: 'nested',
                value: {},
              },
              {
                type: 'object',
                origin: 'key',
                input: input.nested,
                key: 'key2',
                value: undefined,
              },
            ],
          },
        ],
      } satisfies FailureDataset<InferIssue<typeof schema>>);
    });

    test('for missing entries with abort early', async () => {
      const input = { key2: 123 };
      expect(
        await schema['~run']({ value: input }, { abortEarly: true })
      ).toStrictEqual({
        typed: false,
        value: {},
        issues: [
          {
            ...baseInfo,
            kind: 'schema',
            type: 'object',
            input: undefined,
            expected: '"key1"',
            received: 'undefined',
            path: [
              {
                type: 'object',
                origin: 'key',
                input,
                key: 'key1',
                value: undefined,
              },
            ],
            abortEarly: true,
          },
        ],
      } satisfies FailureDataset<InferIssue<typeof schema>>);
    });

    test('for missing any and unknown entry', async () => {
      const schema = objectAsync({ key1: any(), key2: unknown() });
      expect(await schema['~run']({ value: {} }, {})).toStrictEqual({
        typed: false,
        value: {},
        issues: [
          {
            ...baseInfo,
            kind: 'schema',
            type: 'object',
            input: undefined,
            expected: '"key1"',
            received: 'undefined',
            path: [
              {
                type: 'object',
                origin: 'key',
                input: {},
                key: 'key1',
                value: undefined,
              },
            ],
          },
          {
            ...baseInfo,
            kind: 'schema',
            type: 'object',
            input: undefined,
            expected: '"key2"',
            received: 'undefined',
            path: [
              {
                type: 'object',
                origin: 'key',
                input: {},
                key: 'key2',
                value: undefined,
              },
            ],
          },
        ],
      } satisfies FailureDataset<InferIssue<typeof schema>>);
    });

    test('for invalid entries', async () => {
      const input = { key1: false, key2: 123, nested: null };
      expect(await schema['~run']({ value: input }, {})).toStrictEqual({
        typed: false,
        value: input,
        issues: [
          {
            ...baseInfo,
            kind: 'schema',
            type: 'string',
            input: false,
            expected: 'string',
            received: 'false',
            path: [
              {
                type: 'object',
                origin: 'value',
                input,
                key: 'key1',
                value: false,
              },
            ],
          },
          {
            ...baseInfo,
            kind: 'schema',
            type: 'object',
            input: null,
            expected: 'Object',
            received: 'null',
            path: [
              {
                type: 'object',
                origin: 'value',
                input,
                key: 'nested',
                value: null,
              },
            ],
          },
        ],
      } satisfies FailureDataset<InferIssue<typeof schema>>);
    });

    test('for invalid nested entries', async () => {
      const input = {
        key1: 'value',
        key2: 'value',
        nested: {
          key1: 123,
          key2: null,
        },
      };
      expect(await schema['~run']({ value: input }, {})).toStrictEqual({
        typed: false,
        value: input,
        issues: [
          {
            ...baseInfo,
            kind: 'schema',
            type: 'number',
            input: 'value',
            expected: 'number',
            received: '"value"',
            path: [
              {
                type: 'object',
                origin: 'value',
                input,
                key: 'key2',
                value: input.key2,
              },
            ],
          },
          {
            ...baseInfo,
            kind: 'schema',
            type: 'string',
            input: 123,
            expected: 'string',
            received: '123',
            path: [
              {
                type: 'object',
                origin: 'value',
                input,
                key: 'nested',
                value: input.nested,
              },
              {
                type: 'object',
                origin: 'value',
                input: input.nested,
                key: 'key1',
                value: input.nested.key1,
              },
            ],
          },
          {
            ...baseInfo,
            kind: 'schema',
            type: 'number',
            input: null,
            expected: 'number',
            received: 'null',
            path: [
              {
                type: 'object',
                origin: 'value',
                input,
                key: 'nested',
                value: input.nested,
              },
              {
                type: 'object',
                origin: 'value',
                input: input.nested,
                key: 'key2',
                value: input.nested.key2,
              },
            ],
          },
        ],
      } satisfies FailureDataset<InferIssue<typeof schema>>);
    });

    test('for invalid entries with abort early', async () => {
      const input = { key1: false, key2: 123, nested: null };
      expect(
        await schema['~run']({ value: input }, { abortEarly: true })
      ).toStrictEqual({
        typed: false,
        value: {},
        issues: [
          {
            ...baseInfo,
            kind: 'schema',
            type: 'string',
            input: false,
            expected: 'string',
            received: 'false',
            path: [
              {
                type: 'object',
                origin: 'value',
                input,
                key: 'key1',
                value: false,
              },
            ],
            abortEarly: true,
          },
        ],
      } satisfies FailureDataset<InferIssue<typeof schema>>);
    });

    test('for invalid exact optional entry', async () => {
      const schema = objectAsync({
        key1: exactOptional(string()),
        key2: exactOptionalAsync(string()),
      });
      const input = { key1: undefined, key2: undefined };
      expect(await schema['~run']({ value: input }, {})).toStrictEqual({
        typed: false,
        value: input,
        issues: [
          {
            ...baseInfo,
            kind: 'schema',
            type: 'string',
            input: undefined,
            expected: 'string',
            received: 'undefined',
            path: [
              {
                type: 'object',
                origin: 'value',
                input,
                key: 'key1',
                value: undefined,
              },
            ],
          },
          {
            ...baseInfo,
            kind: 'schema',
            type: 'string',
            input: undefined,
            expected: 'string',
            received: 'undefined',
            path: [
              {
                type: 'object',
                origin: 'value',
                input,
                key: 'key2',
                value: undefined,
              },
            ],
          },
        ],
      } satisfies FailureDataset<InferIssue<typeof schema>>);
    });
  });
});
