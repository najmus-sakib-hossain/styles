import { describe, expectTypeOf, test } from 'vitest';
import {
  boolean,
  number,
  object,
  objectAsync,
  strictObjectAsync,
  strictTupleAsync,
  string,
  tuple,
  tupleAsync,
} from '../../schemas/index.ts';
import { fallback, fallbackAsync } from '../fallback/index.ts';
import { getFallbacksAsync } from './getFallbacksAsync.ts';

describe('getFallbacksAsync', () => {
  test('should return undefined', () => {
    expectTypeOf(getFallbacksAsync(string())).toEqualTypeOf<
      Promise<undefined>
    >();
    expectTypeOf(getFallbacksAsync(number())).toEqualTypeOf<
      Promise<undefined>
    >();
    expectTypeOf(getFallbacksAsync(boolean())).toEqualTypeOf<
      Promise<undefined>
    >();
  });

  test('should return default', () => {
    expectTypeOf(
      getFallbacksAsync(fallback(string(), 'foo' as const))
    ).toEqualTypeOf<Promise<'foo'>>();
    expectTypeOf(
      getFallbacksAsync(fallback(number(), () => 123 as const))
    ).toEqualTypeOf<Promise<123>>();
    expectTypeOf(
      getFallbacksAsync(fallbackAsync(boolean(), async () => false as const))
    ).toEqualTypeOf<Promise<false>>();
  });

  describe('should return object defaults', () => {
    test('for empty object', () => {
      // eslint-disable-next-line @typescript-eslint/no-empty-object-type
      expectTypeOf(getFallbacksAsync(object({}))).toEqualTypeOf<Promise<{}>>();
    });

    test('for simple object', () => {
      expectTypeOf(
        getFallbacksAsync(
          objectAsync({
            key1: fallback(string(), 'foo' as const),
            key2: fallback(number(), () => 123 as const),
            key3: fallbackAsync(boolean(), false as const),
            key4: string(),
          })
        )
      ).toEqualTypeOf<
        Promise<{
          key1: 'foo';
          key2: 123;
          key3: false;
          key4: undefined;
        }>
      >();
    });

    test('for nested object', () => {
      expectTypeOf(
        getFallbacksAsync(
          objectAsync({
            nested: strictObjectAsync({
              key1: fallback(string(), 'foo' as const),
              key2: fallback(number(), () => 123 as const),
              key3: fallbackAsync(boolean(), false as const),
            }),
            other: string(),
          })
        )
      ).toEqualTypeOf<
        Promise<{
          nested: {
            key1: 'foo';
            key2: 123;
            key3: false;
          };
          other: undefined;
        }>
      >();
    });
  });

  describe('should return tuple defaults', () => {
    test('for empty tuple', () => {
      expectTypeOf(getFallbacksAsync(tuple([]))).toEqualTypeOf<Promise<[]>>();
    });

    test('for simple tuple', () => {
      expectTypeOf(
        getFallbacksAsync(
          tupleAsync([
            fallback(string(), 'foo' as const),
            fallback(number(), () => 123 as const),
            fallbackAsync(boolean(), false as const),
            string(),
          ])
        )
      ).toEqualTypeOf<Promise<['foo', 123, false, undefined]>>();
    });

    test('for nested tuple', () => {
      expectTypeOf(
        getFallbacksAsync(
          tupleAsync([
            strictTupleAsync([
              fallback(string(), 'foo' as const),
              fallback(number(), () => 123 as const),
              fallbackAsync(boolean(), false as const),
            ]),
            string(),
          ])
        )
      ).toEqualTypeOf<Promise<[['foo', 123, false], undefined]>>();
    });
  });
});
