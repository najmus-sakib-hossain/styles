if (typeof window === 'undefined') {
  await import('./orpc.server')
}

import type { RouterClient } from '@orpc/server'
import type { router } from '~/router'
import { createORPCClient } from '@orpc/client'
import { RPCLink } from '@orpc/client/fetch'
import { createTanstackQueryUtils } from '@orpc/tanstack-query'
import { getRequestEvent } from 'solid-js/web'

declare global {
  var $client: RouterClient<typeof router> | undefined
}

const link = new RPCLink({
  url: `${typeof window !== 'undefined' ? window.location.origin : 'http://localhost:3000'}/rpc`,
  headers: () => Object.fromEntries(getRequestEvent()?.request.headers ?? []),
})

export const client: RouterClient<typeof router> = globalThis.$client ?? createORPCClient(link)

export const orpc = createTanstackQueryUtils(client)
