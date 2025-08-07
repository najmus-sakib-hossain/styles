import type { ContractRouterClient } from '@orpc/contract'
import type { RouterClient } from '@orpc/server'
import type { router as contract } from '../../contract/tests/shared'
import type { router } from '../../server/tests/shared'
import type { ClientLink } from './types'
import { createORPCClient } from './client'

it('createORPCClient require match context between client and link', () => {
  const _1: RouterClient<typeof router, { cache: string }> = createORPCClient({} as ClientLink<{ cache: string }>)
  const _11: RouterClient<typeof router, { cache?: string }> = createORPCClient({} as ClientLink<{ cache?: string }>)
  const _111: RouterClient<typeof router, { cache?: string }> = createORPCClient({} as ClientLink<{ cache?: string, tags?: string[] }>)
  const _1111: RouterClient<typeof router> = createORPCClient({} as ClientLink<{ cache?: string }>)
  // @ts-expect-error -- cache is required
  const _11111: RouterClient<typeof router> = createORPCClient({} as ClientLink<{ cache: string }>)
  // @ts-expect-error -- expect cache is optional
  const _2: RouterClient<typeof router, { cache?: string }> = createORPCClient({} as ClientLink<{ cache: string }>)
  // @ts-expect-error -- expect cache is number
  const _3: RouterClient<typeof router, { cache?: number }> = createORPCClient({} as ClientLink<{ cache?: string }>)

  const _4: ContractRouterClient<typeof contract> = createORPCClient({} as ClientLink<{ cache?: string }>)
  // @ts-expect-error -- cache is required
  const _44: ContractRouterClient<typeof contract> = createORPCClient({} as ClientLink<{ cache: string }>)
  const _444: ContractRouterClient<typeof contract, { cache: string }> = createORPCClient({} as ClientLink<{ cache: string }>)
})
