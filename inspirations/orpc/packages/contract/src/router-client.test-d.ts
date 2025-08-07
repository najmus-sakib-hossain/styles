import type { ClientContext, NestedClient } from '@orpc/client'
import type { ContractRouterClient } from './router-client'
import { ping, pong } from '../tests/shared'

const router = {
  ping,
  pong,
  nested: {
    ping,
    pong,
  },
}

describe('ContractRouterClient', () => {
  it('is a NestedClient', () => {
    expectTypeOf<ContractRouterClient<typeof router, ClientContext>>().toMatchTypeOf<NestedClient<ClientContext>>()
    expectTypeOf<ContractRouterClient<typeof router, { cache?: boolean }>>().not.toMatchTypeOf<NestedClient<{ cache?: string }>>()
  })
})
