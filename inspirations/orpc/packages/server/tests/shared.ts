import type { Meta, Schema } from '@orpc/contract'
import type { baseErrorMap, BaseMeta, inputSchema, outputSchema, streamedOutputSchema } from '../../contract/tests/shared'
import type { Context } from '../src'
import { ping as pingContract, pong as pongContract, streamed as streamedContract } from '../../contract/tests/shared'
import { lazy, Procedure } from '../src'

export type InitialContext = { db: string }
export type CurrentContext = InitialContext & { auth: boolean }

export const pingHandler = vi.fn(({ input }) => ({ output: Number(input.input) }))
export const pingMiddleware = vi.fn(({ next }) => next())

export const ping = new Procedure<
  InitialContext,
  CurrentContext,
  typeof inputSchema,
  typeof outputSchema,
  typeof baseErrorMap,
  BaseMeta
>({
  ...pingContract['~orpc'],
  middlewares: [pingMiddleware],
  handler: pingHandler,
  inputValidationIndex: 1,
  outputValidationIndex: 1,
})

export const pongHandler = vi.fn(({ input }) => input)

export const pong = new Procedure<
  Context,
  Context,
  Schema<unknown, unknown>,
  Schema<unknown, unknown>,
  Record<never, never>,
  Meta
>({
  ...pongContract['~orpc'],
  middlewares: [],
  handler: pongHandler,
  inputValidationIndex: 0,
  outputValidationIndex: 0,
})

export const router = {
  ping: lazy(() => Promise.resolve({ default: ping })),
  pong,
  nested: lazy(() => Promise.resolve({
    default: {
      ping,
      pong: lazy(() => Promise.resolve({ default: pong })),
    },
  })),
}

export const streamedHandler = vi.fn(async function* ({ input }) {
  for (let i = 0; i < input.input; i++) {
    yield { output: i }
  }

  return 'done'
})

export const streamed = new Procedure<
  Context,
  Context,
  typeof inputSchema,
  typeof streamedOutputSchema,
  typeof baseErrorMap,
  Meta
>({
  ...streamedContract['~orpc'],
  inputValidationIndex: 0,
  outputValidationIndex: 0,
  middlewares: [],
  handler: streamedHandler,
})

export { router as contract, ping as pingContract, pong as pongContract } from '../../contract/tests/shared'
