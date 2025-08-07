import type { ContractRouter, Meta } from '@orpc/contract'
import type { BaseMeta } from '../../contract/tests/shared'
import type { CurrentContext, InitialContext } from '../tests/shared'
import type { Context } from './context'
import type { InferRouterCurrentContexts, InferRouterInitialContext, InferRouterInitialContexts, InferRouterInputs, InferRouterOutputs, Router } from './router'
import { ping, pong, router } from '../tests/shared'

describe('Router', () => {
  it('also a contract router when not has lazy router', () => {
    const router = {
      ping,
      pong,
      nested: {
        ping,
        pong,
      },
    }

    expectTypeOf(ping).toMatchTypeOf<ContractRouter<BaseMeta>>()
    expectTypeOf(router).toMatchTypeOf<ContractRouter<Meta>>()
  })

  it('initial context', () => {
    expectTypeOf(router).toMatchTypeOf<Router<any, InitialContext>>()
    expectTypeOf(router).toMatchTypeOf<Router<any, InitialContext & { extra?: string }>>()

    expectTypeOf(router).not.toMatchTypeOf<Router<any, Omit<InitialContext, 'db'>>>()
    expectTypeOf(router).not.toMatchTypeOf<Router<any, { db: number }>>()
  })
})

it('InferRouterInitialContext', () => {
  expectTypeOf<InferRouterInitialContext<typeof router>>().toEqualTypeOf<InitialContext & Context>()
  expectTypeOf<InferRouterInitialContext<typeof ping>>().toEqualTypeOf<InitialContext>()
  expectTypeOf<InferRouterInitialContext<typeof pong>>().toEqualTypeOf<Context>()
})

it('InferRouterInitialContexts', () => {
  expectTypeOf<InferRouterInitialContexts<typeof router>['ping']>().toEqualTypeOf<InitialContext>()
  expectTypeOf<InferRouterInitialContexts<typeof router>['nested']['ping']>().toEqualTypeOf<InitialContext>()
  expectTypeOf<InferRouterInitialContexts<typeof router>['pong']>().toEqualTypeOf<Context>()
  expectTypeOf<InferRouterInitialContexts<typeof router>['nested']['pong']>().toEqualTypeOf<Context>()
})

it('InferRouterCurrentContexts', () => {
  expectTypeOf<InferRouterCurrentContexts<typeof router>['ping']>().toEqualTypeOf<CurrentContext>()
  expectTypeOf<InferRouterCurrentContexts<typeof router>['nested']['ping']>().toEqualTypeOf<CurrentContext>()
  expectTypeOf<InferRouterCurrentContexts<typeof router>['pong']>().toEqualTypeOf<Context>()
  expectTypeOf<InferRouterCurrentContexts<typeof router>['nested']['pong']>().toEqualTypeOf<Context>()
})

it('InferRouterInputs', () => {
  type Inferred = InferRouterInputs<typeof router>

  expectTypeOf<Inferred['ping']>().toEqualTypeOf<{ input: number }>()
  expectTypeOf<Inferred['nested']['ping']>().toEqualTypeOf<{ input: number }>()

  expectTypeOf<Inferred['pong']>().toEqualTypeOf<unknown>()
  expectTypeOf<Inferred['nested']['pong']>().toEqualTypeOf<unknown>()
})

it('InferRouterOutputs', () => {
  type Inferred = InferRouterOutputs<typeof router>

  expectTypeOf<Inferred['ping']>().toEqualTypeOf<{ output: string }>()
  expectTypeOf<Inferred['nested']['ping']>().toEqualTypeOf<{ output: string }>()

  expectTypeOf<Inferred['pong']>().toEqualTypeOf<unknown>()
  expectTypeOf<Inferred['nested']['pong']>().toEqualTypeOf<unknown>()
})
