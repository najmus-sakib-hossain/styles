import type { ContractProcedure } from '@orpc/contract'
import type { baseErrorMap, BaseMeta, inputSchema, outputSchema } from '../../contract/tests/shared'
import type { CurrentContext, InitialContext } from '../tests/shared'
import type { Procedure } from './procedure'

const procedure = {} as Procedure<
  InitialContext,
  CurrentContext,
  typeof inputSchema,
  typeof outputSchema,
  typeof baseErrorMap,
  BaseMeta
>

describe('Procedure', () => {
  it('is a contract procedure', () => {
    expectTypeOf(procedure).toMatchTypeOf<
      ContractProcedure<
        typeof inputSchema,
        typeof outputSchema,
        typeof baseErrorMap,
        BaseMeta
      >
    >()
  })
})
