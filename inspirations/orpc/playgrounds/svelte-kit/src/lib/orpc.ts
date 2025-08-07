import type { RouterClient } from '@orpc/server'
import type { router } from '../router'
import { createORPCClient } from '@orpc/client'
import { RPCLink } from '@orpc/client/fetch'
import { createTanstackQueryUtils } from '@orpc/tanstack-query'

const rpcLink = new RPCLink({
  url: `${typeof window !== 'undefined' ? window.location.origin : 'http://localhost:3000'}/rpc`,
  headers: () => ({
    Authorization: 'Bearer default-token',
  }),
})

export const client: RouterClient<typeof router> = createORPCClient(rpcLink)

export const orpc = createTanstackQueryUtils(client)
