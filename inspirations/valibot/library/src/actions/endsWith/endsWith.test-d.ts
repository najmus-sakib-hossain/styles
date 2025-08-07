import { describe, expectTypeOf, test } from 'vitest';
import type { InferInput, InferIssue, InferOutput } from '../../types/index.ts';
import {
  endsWith,
  type EndsWithAction,
  type EndsWithIssue,
} from './endsWith.ts';

describe('endsWith', () => {
  describe('should return action object', () => {
    test('with undefined message', () => {
      type Action = EndsWithAction<string, 'foo', undefined>;
      expectTypeOf(endsWith<string, 'foo'>('foo')).toEqualTypeOf<Action>();
      expectTypeOf(
        endsWith<string, 'foo', undefined>('foo', undefined)
      ).toEqualTypeOf<Action>();
    });

    test('with string message', () => {
      expectTypeOf(
        endsWith<string, 'foo', 'message'>('foo', 'message')
      ).toEqualTypeOf<EndsWithAction<string, 'foo', 'message'>>();
    });

    test('with function message', () => {
      expectTypeOf(
        endsWith<string, 'foo', () => string>('foo', () => 'message')
      ).toEqualTypeOf<EndsWithAction<string, 'foo', () => string>>();
    });
  });

  describe('should infer correct types', () => {
    type Action = EndsWithAction<string, 'foo', undefined>;

    test('of input', () => {
      expectTypeOf<InferInput<Action>>().toEqualTypeOf<string>();
    });

    test('of output', () => {
      expectTypeOf<InferOutput<Action>>().toEqualTypeOf<string>();
    });

    test('of issue', () => {
      expectTypeOf<InferIssue<Action>>().toEqualTypeOf<
        EndsWithIssue<string, 'foo'>
      >();
    });
  });
});
