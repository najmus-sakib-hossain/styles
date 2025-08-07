import type { Client, NestedClient } from '@orpc/client'
import type { ErrorFromErrorMap } from '@orpc/contract'
import type { baseErrorMap } from '../../contract/tests/shared'
import type { router } from '../tests/shared'
import type { RouterClient } from './router-client'

const routerClient = {} as RouterClient<typeof router, { cache: boolean }>

describe('RouterClient', () => {
  it('is a nested client', () => {
    expectTypeOf(routerClient).toMatchTypeOf<NestedClient<{ cache: boolean }>>()
  })

  it('works', () => {
    expectTypeOf(routerClient.ping).toEqualTypeOf<
      Client<{ cache: boolean }, { input: number }, { output: string }, ErrorFromErrorMap<typeof baseErrorMap>>
    >()

    expectTypeOf(routerClient.nested.ping).toEqualTypeOf<
      Client<{ cache: boolean }, { input: number }, { output: string }, ErrorFromErrorMap<typeof baseErrorMap>>
    >()

    expectTypeOf(routerClient.pong).toEqualTypeOf<
      Client<{ cache: boolean }, unknown, unknown, Error>
    >()

    expectTypeOf(routerClient.nested.pong).toEqualTypeOf<
      Client<{ cache: boolean }, unknown, unknown, Error>
    >()
  })
})
