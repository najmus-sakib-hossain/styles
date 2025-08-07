import { describe, expectTypeOf, test } from 'vitest';
import type { InferInput, InferIssue, InferOutput } from '../../types/index.ts';
import {
  maxValue,
  type MaxValueAction,
  type MaxValueIssue,
} from './maxValue.ts';

describe('maxValue', () => {
  describe('should return action object', () => {
    test('with undefined message', () => {
      type Action = MaxValueAction<number, 10, undefined>;
      expectTypeOf(maxValue<number, 10>(10)).toEqualTypeOf<Action>();
      expectTypeOf(
        maxValue<number, 10, undefined>(10, undefined)
      ).toEqualTypeOf<Action>();
    });

    test('with string message', () => {
      expectTypeOf(
        maxValue<number, 10, 'message'>(10, 'message')
      ).toEqualTypeOf<MaxValueAction<number, 10, 'message'>>();
    });

    test('with function message', () => {
      expectTypeOf(
        maxValue<number, 10, () => string>(10, () => 'message')
      ).toEqualTypeOf<MaxValueAction<number, 10, () => string>>();
    });
  });

  describe('should infer correct types', () => {
    type Action = MaxValueAction<number, 10, undefined>;

    test('of input', () => {
      expectTypeOf<InferInput<Action>>().toEqualTypeOf<number>();
    });

    test('of output', () => {
      expectTypeOf<InferOutput<Action>>().toEqualTypeOf<number>();
    });

    test('of issue', () => {
      expectTypeOf<InferIssue<Action>>().toEqualTypeOf<
        MaxValueIssue<number, 10>
      >();
    });
  });
});
