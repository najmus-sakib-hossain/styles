import type { InferContractRouterInputs, InferContractRouterOutputs } from '../src'
import type { router } from './helpers'

describe('InferContractRouterInputs', () => {
  it('works', () => {
    type Inputs = InferContractRouterInputs<typeof router>

    expectTypeOf<Inputs['list']>().toEqualTypeOf<{ limit?: number, cursor?: number }>()
    expectTypeOf<Inputs['create']>().toEqualTypeOf<{ name: string, description?: string }>()
  })
})

describe('InferContractRouterOutputs', () => {
  it('works', () => {
    type Outputs = InferContractRouterOutputs<typeof router>

    expectTypeOf<Outputs['list']>().toEqualTypeOf<{ id: number, name: string, description?: string, imageUrl?: string }[]>()
    expectTypeOf<Outputs['delete']>().toEqualTypeOf<unknown>()
  })
})
