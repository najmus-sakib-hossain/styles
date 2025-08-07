import type { ORPCError } from '@orpc/client'
import type { outputSchema } from '../tests/shared'
import type { MergedErrorMap, ORPCErrorFromErrorMap } from './error'
import type { InferSchemaOutput } from './schema'

it('MergedErrorMap', () => {
  expectTypeOf<
    MergedErrorMap<{ BASE: { message: string } }, { INVALID: { message: string } }>
  >().toMatchTypeOf<{ BASE: { message: string }, INVALID: { message: string } }>()

  expectTypeOf<
    MergedErrorMap<{ BASE: { message: string }, INVALID: { status: number } }, { INVALID: { message: string } }>
  >().toMatchTypeOf<{ BASE: { message: string }, INVALID: { message: string } }>()
})

it('ORPCErrorFromErrorMap', () => {
  expectTypeOf<ORPCErrorFromErrorMap<{ BASE: { message: string } }>>().toEqualTypeOf<ORPCError<'BASE', unknown>>()
  expectTypeOf<ORPCErrorFromErrorMap<{ BASE: { message: string }, INVALID: { data: typeof outputSchema } }>>()
    .toEqualTypeOf<ORPCError<'BASE', unknown> | ORPCError<'INVALID', InferSchemaOutput<typeof outputSchema>>>()
})
