import { describe, expect, test } from 'vitest';
import { minLength, transform } from '../../actions/index.ts';
import { objectAsync, string } from '../../schemas/index.ts';
import { pipe } from '../pipe/index.ts';
import { safeParseAsync } from './safeParseAsync.ts';

describe('safeParseAsync', () => {
  test('should return successful output', async () => {
    expect(
      await safeParseAsync(
        objectAsync({
          key: pipe(
            string(),
            minLength(5),
            transform((input) => input.length)
          ),
        }),
        { key: 'foobar' }
      )
    ).toStrictEqual({
      typed: true,
      success: true,
      output: { key: 6 },
      issues: undefined,
    });
  });

  test('should return typed output with issues', async () => {
    expect(
      await safeParseAsync(objectAsync({ key: pipe(string(), minLength(5)) }), {
        key: 'foo',
      })
    ).toStrictEqual({
      typed: true,
      success: false,
      output: { key: 'foo' },
      issues: [
        {
          kind: 'validation',
          type: 'min_length',
          input: 'foo',
          expected: '>=5',
          received: '3',
          message: 'Invalid length: Expected >=5 but received 3',
          requirement: 5,
          path: [
            {
              type: 'object',
              origin: 'value',
              input: { key: 'foo' },
              key: 'key',
              value: 'foo',
            },
          ],
          issues: undefined,
          lang: undefined,
          abortEarly: undefined,
          abortPipeEarly: undefined,
        },
      ],
    });
  });

  test('should return untyped output with issues', async () => {
    expect(
      await safeParseAsync(objectAsync({ key: string() }), { key: 123 })
    ).toStrictEqual({
      typed: false,
      success: false,
      output: { key: 123 },
      issues: [
        {
          kind: 'schema',
          type: 'string',
          input: 123,
          expected: 'string',
          received: '123',
          message: 'Invalid type: Expected string but received 123',
          requirement: undefined,
          path: [
            {
              type: 'object',
              origin: 'value',
              input: { key: 123 },
              key: 'key',
              value: 123,
            },
          ],
          issues: undefined,
          lang: undefined,
          abortEarly: undefined,
          abortPipeEarly: undefined,
        },
      ],
    });
  });
});
