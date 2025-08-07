import { describe, expect, test } from 'vitest';
import { CUID2_REGEX } from '../../regex.ts';
import type { StringIssue } from '../../schemas/index.ts';
import { expectActionIssue, expectNoActionIssue } from '../../vitest/index.ts';
import { cuid2, type Cuid2Action, type Cuid2Issue } from './cuid2.ts';

describe('cuid2', () => {
  describe('should return action object', () => {
    const baseAction: Omit<Cuid2Action<string, never>, 'message'> = {
      kind: 'validation',
      type: 'cuid2',
      reference: cuid2,
      expects: null,
      requirement: CUID2_REGEX,
      async: false,
      '~run': expect.any(Function),
    };

    test('with undefined message', () => {
      const action: Cuid2Action<string, undefined> = {
        ...baseAction,
        message: undefined,
      };
      expect(cuid2()).toStrictEqual(action);
      expect(cuid2(undefined)).toStrictEqual(action);
    });

    test('with string message', () => {
      expect(cuid2('message')).toStrictEqual({
        ...baseAction,
        message: 'message',
      } satisfies Cuid2Action<string, string>);
    });

    test('with function message', () => {
      const message = () => 'message';
      expect(cuid2(message)).toStrictEqual({
        ...baseAction,
        message,
      } satisfies Cuid2Action<string, typeof message>);
    });
  });

  describe('should return dataset without issues', () => {
    const action = cuid2();

    test('for untyped inputs', () => {
      const issues: [StringIssue] = [
        {
          kind: 'schema',
          type: 'string',
          input: null,
          expected: 'string',
          received: 'null',
          message: 'message',
        },
      ];
      expect(
        action['~run']({ typed: false, value: null, issues }, {})
      ).toStrictEqual({
        typed: false,
        value: null,
        issues,
      });
    });

    test('for single lowercase letters', () => {
      expectNoActionIssue(action, ['a', 'b', 'y', 'z']);
    });

    test('for two lowercase letters', () => {
      expectNoActionIssue(action, ['ab', 'cd', 'wx', 'yz']);
    });

    test('for letter plus digit', () => {
      expectNoActionIssue(action, ['a1', 'b2', 'y8', 'z9']);
    });

    test('for very long Cuid2s', () => {
      expectNoActionIssue(action, [
        'o2dyrckf0vbqhftbcx8ex7r8',
        'pj17j4wheabtydu00x2yuo8s',
        'vkydd2qpoediyioixyeh8zyo',
        'ja3j1arc87i80ys1zxk8iyiv',
        'pbe6zw7wikj83vv5knjk1wx8',
      ]);
    });
  });

  describe('should return dataset with issues', () => {
    const action = cuid2('message');
    const baseIssue: Omit<Cuid2Issue<string>, 'input' | 'received'> = {
      kind: 'validation',
      type: 'cuid2',
      expected: null,
      message: 'message',
      requirement: CUID2_REGEX,
    };

    test('for empty strings', () => {
      expectActionIssue(action, baseIssue, ['', ' ', '\n']);
    });

    test('for string with spaces', () => {
      expectActionIssue(action, baseIssue, [' o2dyr', 'o2dyr ', 'o2d yr']);
    });

    test('for digit as first char', () => {
      expectActionIssue(action, baseIssue, ['1', '9', '1a', '9z']);
    });

    test('for uppercase letters', () => {
      expectActionIssue(action, baseIssue, ['A', 'Bc', 'De', 'F1', 'o2Dyr']);
    });

    test('for special chars', () => {
      expectActionIssue(action, baseIssue, ['@', '#', '$', '%', '&']);
      expectActionIssue(action, baseIssue, ['a@', 'b#', 'x$', 'z%', 'y&']);
    });
  });
});
