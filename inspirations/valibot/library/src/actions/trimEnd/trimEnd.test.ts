import { describe, expect, test } from 'vitest';
import { trimEnd, type TrimEndAction } from './trimEnd.ts';

describe('trimEnd', () => {
  test('should return action object', () => {
    expect(trimEnd()).toStrictEqual({
      kind: 'transformation',
      type: 'trim_end',
      reference: trimEnd,
      async: false,
      '~run': expect.any(Function),
    } satisfies TrimEndAction);
  });

  describe('should trim end of string', () => {
    const action = trimEnd();

    test('for empty string', () => {
      expect(action['~run']({ typed: true, value: '' }, {})).toStrictEqual({
        typed: true,
        value: '',
      });
      expect(action['~run']({ typed: true, value: ' ' }, {})).toStrictEqual({
        typed: true,
        value: '',
      });
    });

    test('with blanks at end', () => {
      expect(action['~run']({ typed: true, value: 'foo  ' }, {})).toStrictEqual(
        {
          typed: true,
          value: 'foo',
        }
      );
    });
  });

  test('should not trim start of string', () => {
    expect(
      trimEnd()['~run']({ typed: true, value: '  foo' }, {})
    ).toStrictEqual({
      typed: true,
      value: '  foo',
    });
  });
});
