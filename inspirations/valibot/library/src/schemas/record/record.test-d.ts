import { describe, expectTypeOf, test } from 'vitest';
import type { ReadonlyAction } from '../../actions/index.ts';
import type { SchemaWithPipe } from '../../methods/index.ts';
import type { InferInput, InferIssue, InferOutput } from '../../types/index.ts';
import {
  number,
  type NumberIssue,
  type NumberSchema,
} from '../number/index.ts';
import type { OptionalSchema } from '../optional/index.ts';
import type { PicklistIssue, PicklistSchema } from '../picklist/index.ts';
import {
  string,
  type StringIssue,
  type StringSchema,
} from '../string/index.ts';
import { record, type RecordSchema } from './record.ts';
import type { RecordIssue } from './types.ts';

describe('record', () => {
  describe('should return schema record', () => {
    const key = string();
    type Key = typeof key;
    const value = number();
    type Value = typeof value;

    test('with undefined message', () => {
      type Schema = RecordSchema<Key, Value, undefined>;
      expectTypeOf(record(key, value)).toEqualTypeOf<Schema>();
      expectTypeOf(record(key, value, undefined)).toEqualTypeOf<Schema>();
    });

    test('with string message', () => {
      expectTypeOf(record(key, value, 'message')).toEqualTypeOf<
        RecordSchema<Key, Value, 'message'>
      >();
    });

    test('with function message', () => {
      expectTypeOf(record(key, value, () => 'message')).toEqualTypeOf<
        RecordSchema<Key, Value, () => string>
      >();
    });
  });

  describe('should infer correct types', () => {
    type Schema1 = RecordSchema<
      StringSchema<undefined>,
      OptionalSchema<NumberSchema<undefined>, 123>,
      undefined
    >;
    type Schema2 = RecordSchema<
      PicklistSchema<['foo', 'bar'], undefined>,
      OptionalSchema<StringSchema<undefined>, 'hello'>,
      undefined
    >;
    type Schema3 = RecordSchema<
      StringSchema<undefined>,
      SchemaWithPipe<[StringSchema<undefined>, ReadonlyAction<string>]>,
      undefined
    >;

    test('of input', () => {
      expectTypeOf<InferInput<Schema1>>().toEqualTypeOf<
        Partial<Record<string, number>>
      >();
      expectTypeOf<InferInput<Schema2>>().toEqualTypeOf<
        Partial<Record<'foo' | 'bar', string>>
      >();
      expectTypeOf<InferInput<Schema3>>().toEqualTypeOf<
        Record<string, string>
      >();
    });

    test('of output', () => {
      expectTypeOf<InferOutput<Schema1>>().toEqualTypeOf<
        Record<string, number>
      >();
      expectTypeOf<InferOutput<Schema2>>().toEqualTypeOf<
        Partial<Record<'foo' | 'bar', string>>
      >();
      expectTypeOf<InferOutput<Schema3>>().toEqualTypeOf<
        Readonly<Record<string, string>>
      >();
    });

    test('of issue', () => {
      expectTypeOf<InferIssue<Schema1>>().toEqualTypeOf<
        RecordIssue | StringIssue | NumberIssue
      >();
      expectTypeOf<InferIssue<Schema2>>().toEqualTypeOf<
        RecordIssue | PicklistIssue | StringIssue
      >();
      expectTypeOf<InferIssue<Schema3>>().toEqualTypeOf<
        RecordIssue | StringIssue
      >();
    });
  });
});
