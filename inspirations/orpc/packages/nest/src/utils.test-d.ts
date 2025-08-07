import type { ContractProcedure } from '@orpc/contract'
import type { PopulatedContractRouterPaths } from './utils'
import { oc } from '@orpc/contract'
import { expectTypeOf } from 'vitest'
import { baseErrorMap, inputSchema, outputSchema, router } from '../../contract/tests/shared'

it('PopulatedContractRouterPaths', () => {
  expectTypeOf<PopulatedContractRouterPaths<typeof router>>().toEqualTypeOf(router)

  const ping = oc
    .$meta({ meta: true })
    .input(inputSchema)
    .errors(baseErrorMap)
    .output(outputSchema)
    .route({ path: '/ping' })

  expectTypeOf<PopulatedContractRouterPaths<typeof ping>>().toEqualTypeOf<
    ContractProcedure<
        typeof inputSchema,
        typeof outputSchema,
        typeof baseErrorMap & Record<never, never>,
        { meta: boolean } & Record<never, never>
    >
  >()
})
