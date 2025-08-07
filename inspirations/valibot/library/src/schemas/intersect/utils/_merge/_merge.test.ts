import { describe, expect, test } from 'vitest';
import { _merge } from './_merge.ts';

describe('_merge', () => {
  describe('should return dataset with value', () => {
    test('for valid primitives', () => {
      const date = new Date();
      expect(_merge(1, 1)).toStrictEqual({ value: 1 });
      expect(_merge('foo', 'foo')).toStrictEqual({ value: 'foo' });
      expect(_merge(date, date)).toStrictEqual({ value: date });
      expect(_merge(new Date(+date), new Date(+date))).toStrictEqual({
        value: date,
      });
    });

    test('for valid dates', () => {
      const date = new Date();
      expect(_merge(date, date)).toStrictEqual({ value: date });
      expect(_merge(new Date(+date), new Date(+date))).toStrictEqual({
        value: date,
      });
    });

    test('for valid objects', () => {
      expect(_merge({ key: 1 }, { key: 1 })).toStrictEqual({
        value: { key: 1 },
      });
      expect(_merge({ a: 1 }, { b: 2 })).toStrictEqual({
        value: { a: 1, b: 2 },
      });
      expect(_merge({ key: { a: 1 } }, { key: { b: 2 } })).toStrictEqual({
        value: { key: { a: 1, b: 2 } },
      });
    });

    test('for valid arrays', () => {
      expect(_merge([1, 2, 3], [1, 2, 3])).toStrictEqual({ value: [1, 2, 3] });
      expect(_merge([{ a: 1 }, { a: 1 }], [{ b: 2 }, { b: 2 }])).toStrictEqual({
        value: [
          { a: 1, b: 2 },
          { a: 1, b: 2 },
        ],
      });
    });
  });

  describe('should return dataset with issue', () => {
    test('for invalid primitives', () => {
      expect(_merge(1, 2)).toStrictEqual({ issue: true });
      expect(_merge('foo', 'bar')).toStrictEqual({ issue: true });
      expect(_merge(1, 'foo')).toStrictEqual({ issue: true });
    });

    test('for invalid dates', () => {
      const date = new Date();
      expect(_merge(date, new Date(+date + 1234))).toStrictEqual({
        issue: true,
      });
    });

    test('for invalid objects', () => {
      expect(_merge({ key: 1 }, { key: '1' })).toStrictEqual({ issue: true });
    });

    test('for invalid arrays', () => {
      expect(_merge([1], [1, 2])).toStrictEqual({ issue: true });
      expect(_merge([1], ['1'])).toStrictEqual({ issue: true });
    });
  });
});
