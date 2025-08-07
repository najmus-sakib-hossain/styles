import { describe, expect, test } from 'vitest';
import {
  expectNoSchemaIssueAsync,
  expectSchemaIssueAsync,
} from '../../vitest/index.ts';
import {
  string,
  type StringIssue,
  type StringSchema,
} from '../string/index.ts';
import { nullableAsync, type NullableSchemaAsync } from './nullableAsync.ts';

describe('nullableAsync', () => {
  describe('should return schema object', () => {
    const baseSchema: Omit<
      NullableSchemaAsync<StringSchema<undefined>, string>,
      'default'
    > = {
      kind: 'schema',
      type: 'nullable',
      reference: nullableAsync,
      expects: '(string | null)',
      wrapped: {
        ...string(),
        '~standard': {
          version: 1,
          vendor: 'valibot',
          validate: expect.any(Function),
        },
        '~run': expect.any(Function),
      },
      async: true,
      '~standard': {
        version: 1,
        vendor: 'valibot',
        validate: expect.any(Function),
      },
      '~run': expect.any(Function),
    };

    test('with undefined default', () => {
      const expected: NullableSchemaAsync<
        StringSchema<undefined>,
        undefined
      > = {
        ...baseSchema,
        default: undefined,
      };
      expect(nullableAsync(string())).toStrictEqual(expected);
      expect(nullableAsync(string(), undefined)).toStrictEqual(expected);
    });

    test('with null default', () => {
      expect(nullableAsync(string(), null)).toStrictEqual({
        ...baseSchema,
        default: null,
      } satisfies NullableSchemaAsync<StringSchema<undefined>, null>);
    });

    test('with null getter default', () => {
      const getter = () => null;
      expect(nullableAsync(string(), getter)).toStrictEqual({
        ...baseSchema,
        default: getter,
      } satisfies NullableSchemaAsync<StringSchema<undefined>, typeof getter>);
    });

    test('with async null getter default', () => {
      const getter = async () => null;
      expect(nullableAsync(string(), getter)).toStrictEqual({
        ...baseSchema,
        default: getter,
      } satisfies NullableSchemaAsync<StringSchema<undefined>, typeof getter>);
    });

    test('with value default', () => {
      expect(nullableAsync(string(), 'foo')).toStrictEqual({
        ...baseSchema,
        default: 'foo',
      } satisfies NullableSchemaAsync<StringSchema<undefined>, 'foo'>);
    });

    test('with value getter default', () => {
      const getter = () => 'foo';
      expect(nullableAsync(string(), getter)).toStrictEqual({
        ...baseSchema,
        default: getter,
      } satisfies NullableSchemaAsync<StringSchema<undefined>, typeof getter>);
    });

    test('with async value getter default', () => {
      const getter = async () => 'foo';
      expect(nullableAsync(string(), getter)).toStrictEqual({
        ...baseSchema,
        default: getter,
      } satisfies NullableSchemaAsync<StringSchema<undefined>, typeof getter>);
    });
  });

  describe('should return dataset without issues', () => {
    const schema = nullableAsync(string());

    test('for wrapper type', async () => {
      await expectNoSchemaIssueAsync(schema, ['', 'foo', '#$%']);
    });

    test('for null', async () => {
      await expectNoSchemaIssueAsync(schema, [null]);
    });
  });

  describe('should return dataset with issues', () => {
    const schema = nullableAsync(string('message'));
    const baseIssue: Omit<StringIssue, 'input' | 'received'> = {
      kind: 'schema',
      type: 'string',
      expected: 'string',
      message: 'message',
    };

    test('for invalid wrapper type', async () => {
      await expectSchemaIssueAsync(schema, baseIssue, [123, true, {}]);
    });

    test('for undefined', async () => {
      await expectSchemaIssueAsync(schema, baseIssue, [undefined]);
    });
  });

  describe('should return dataset without default', () => {
    test('for undefined default', async () => {
      await expectNoSchemaIssueAsync(nullableAsync(string()), [null, 'foo']);
      await expectNoSchemaIssueAsync(nullableAsync(string(), undefined), [
        null,
        'foo',
      ]);
    });

    test('for wrapper type', async () => {
      await expectNoSchemaIssueAsync(nullableAsync(string(), 'foo'), [
        '',
        'bar',
        '#$%',
      ]);
    });
  });

  describe('should return dataset with default', () => {
    const schema1 = nullableAsync(string(), null);
    const schema2 = nullableAsync(string(), 'foo');
    const schema3 = nullableAsync(string(), () => null);
    const schema4 = nullableAsync(string(), () => 'foo');
    const schema5 = nullableAsync(string(), async () => null);
    const schema6 = nullableAsync(string(), async () => 'foo');

    test('for null', async () => {
      expect(await schema1['~run']({ value: null }, {})).toStrictEqual({
        typed: true,
        value: null,
      });
      expect(await schema2['~run']({ value: null }, {})).toStrictEqual({
        typed: true,
        value: 'foo',
      });
      expect(await schema3['~run']({ value: null }, {})).toStrictEqual({
        typed: true,
        value: null,
      });
      expect(await schema4['~run']({ value: null }, {})).toStrictEqual({
        typed: true,
        value: 'foo',
      });
      expect(await schema5['~run']({ value: null }, {})).toStrictEqual({
        typed: true,
        value: null,
      });
      expect(await schema6['~run']({ value: null }, {})).toStrictEqual({
        typed: true,
        value: 'foo',
      });
    });
  });
});
