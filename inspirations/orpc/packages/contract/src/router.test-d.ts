import type { baseErrorMap, BaseMeta } from '../tests/shared'
import type { Meta } from './meta'
import type { ContractRouter, InferContractRouterErrorMap, InferContractRouterInputs, InferContractRouterMeta, InferContractRouterOutputs } from './router'
import { router } from '../tests/shared'

describe('ContractRouter', () => {
  it('meta', () => {
    expectTypeOf(router).toMatchTypeOf<ContractRouter<BaseMeta>>()
    expectTypeOf(router).toMatchTypeOf<ContractRouter<BaseMeta & { extra?: string }>>()

    expectTypeOf(router).not.toMatchTypeOf<ContractRouter<Omit<BaseMeta, 'mode'> & { mode?: number }>>()
  })
})

it('InferContractRouterInputs', () => {
  type Inputs = InferContractRouterInputs<typeof router>

  expectTypeOf<Inputs['ping']>().toEqualTypeOf<{ input: number }>()
  expectTypeOf<Inputs['pong']>().toEqualTypeOf<unknown>()

  expectTypeOf<Inputs['nested']['ping']>().toEqualTypeOf<{ input: number }>()
  expectTypeOf<Inputs['nested']['pong']>().toEqualTypeOf<unknown>()
})

it('InferContractRouterOutputs', () => {
  type Outputs = InferContractRouterOutputs<typeof router>

  expectTypeOf<Outputs['ping']>().toEqualTypeOf<{ output: string }>()
  expectTypeOf<Outputs['pong']>().toEqualTypeOf<unknown>()

  expectTypeOf<Outputs['nested']['ping']>().toEqualTypeOf<{ output: string }>()
  expectTypeOf<Outputs['nested']['pong']>().toEqualTypeOf<unknown>()
})

it('InferContractRouterErrorMap', () => {
  expectTypeOf<InferContractRouterErrorMap<typeof router>>().toEqualTypeOf<typeof baseErrorMap | Record<never, never>>()
})

it('InferContractRouterMeta', () => {
  expectTypeOf<InferContractRouterMeta<typeof router>>().toEqualTypeOf<BaseMeta | Meta>()
})
