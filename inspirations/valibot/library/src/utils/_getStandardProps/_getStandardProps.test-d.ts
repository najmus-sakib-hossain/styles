import { describe, expectTypeOf, test } from 'vitest';
import { transform } from '../../actions/index.ts';
import { pipe } from '../../methods/index.ts';
import { object, string } from '../../schemas/index.ts';
import type { StandardProps } from '../../types/index.ts';
import { _getStandardProps } from './_getStandardProps.ts';

describe('_getStandardProps', () => {
  test('should return spec properties', () => {
    expectTypeOf(_getStandardProps(string())).toEqualTypeOf<
      StandardProps<string, string>
    >();
    expectTypeOf(
      _getStandardProps(pipe(string(), transform(Number)))
    ).toEqualTypeOf<StandardProps<string, number>>();
    expectTypeOf(
      _getStandardProps(
        pipe(
          object({ foo: string() }),
          transform((input) => ({ ...input, bar: 123 }))
        )
      )
    ).toEqualTypeOf<
      StandardProps<{ foo: string }, { foo: string; bar: number }>
    >();
  });
});
