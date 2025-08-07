import type { Client, ORPCError } from '@orpc/client'
import type { baseErrorMap, inputSchema, outputSchema } from '../tests/shared'
import type { ContractProcedureClient } from './procedure-client'

describe('ContractProcedureClient', () => {
  it('is a client', () => {
    expectTypeOf<
      ContractProcedureClient<{ cache?: boolean }, typeof inputSchema, typeof outputSchema, typeof baseErrorMap>
    >().toEqualTypeOf<
      Client<
        { cache?: boolean },
        { input: number },
        { output: string },
        Error | ORPCError<'BASE', { output: string }> | ORPCError<'OVERRIDE', unknown>
      >
    >()
  })
})
