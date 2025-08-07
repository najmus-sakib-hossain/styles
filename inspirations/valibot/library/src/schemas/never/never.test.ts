import { describe, expect, test } from 'vitest';
import { expectSchemaIssue } from '../../vitest/index.ts';
import { never, type NeverIssue, type NeverSchema } from './never.ts';

describe('never', () => {
  describe('should return schema object', () => {
    const baseSchema: Omit<NeverSchema<never>, 'message'> = {
      kind: 'schema',
      type: 'never',
      reference: never,
      expects: 'never',
      async: false,
      '~standard': {
        version: 1,
        vendor: 'valibot',
        validate: expect.any(Function),
      },
      '~run': expect.any(Function),
    };

    test('with undefined message', () => {
      const schema: NeverSchema<undefined> = {
        ...baseSchema,
        message: undefined,
      };
      expect(never()).toStrictEqual(schema);
      expect(never(undefined)).toStrictEqual(schema);
    });

    test('with string message', () => {
      expect(never('message')).toStrictEqual({
        ...baseSchema,
        message: 'message',
      } satisfies NeverSchema<'message'>);
    });

    test('with function message', () => {
      const message = () => 'message';
      expect(never(message)).toStrictEqual({
        ...baseSchema,
        message,
      } satisfies NeverSchema<typeof message>);
    });
  });

  describe('should return dataset with issues', () => {
    const schema = never('message');
    const baseIssue: Omit<NeverIssue, 'input' | 'received'> = {
      kind: 'schema',
      type: 'never',
      expected: 'never',
      message: 'message',
    };

    // Primitive types

    test('for bigints', () => {
      expectSchemaIssue(schema, baseIssue, [-1n, 0n, 123n]);
    });

    test('for booleans', () => {
      expectSchemaIssue(schema, baseIssue, [true, false]);
    });

    test('for null', () => {
      expectSchemaIssue(schema, baseIssue, [null]);
    });

    test('for numbers', () => {
      expectSchemaIssue(schema, baseIssue, [-1, 0, 123, 45.67]);
    });

    test('for undefined', () => {
      expectSchemaIssue(schema, baseIssue, [undefined]);
    });

    test('for strings', () => {
      expectSchemaIssue(schema, baseIssue, ['', '0', '-2', '12.34']);
    });

    test('for symbols', () => {
      expectSchemaIssue(schema, baseIssue, [Symbol(), Symbol('foo')]);
    });

    // Complex types

    test('for arrays', () => {
      expectSchemaIssue(schema, baseIssue, [[], ['value']]);
    });

    test('for functions', () => {
      // eslint-disable-next-line @typescript-eslint/no-empty-function
      expectSchemaIssue(schema, baseIssue, [() => {}, function () {}]);
    });

    test('for objects', () => {
      expectSchemaIssue(schema, baseIssue, [{}, { key: 'value' }]);
    });
  });
});
