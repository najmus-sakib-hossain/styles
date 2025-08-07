import type { PartialDeep } from '@orpc/shared'
import type { EntryKey } from '@pinia/colada'
import { StandardRPCJsonSerializer } from '@orpc/client/standard'

export interface BuildKeyOptions<TInput> {
  type?: 'query' | 'mutation'
  input?: PartialDeep<TInput>
}

export function buildKey<TInput>(
  path: string[],
  options: BuildKeyOptions<TInput> = {},
): EntryKey {
  const [json] = new StandardRPCJsonSerializer().serialize(options.input)

  const withInput = json !== undefined ? { input: json } : {}
  const withType = options.type !== undefined ? { type: options.type } : {}

  return [
    path,
    {
      ...withInput,
      ...withType as any,
    },
  ]
}
