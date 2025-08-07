import { QueryClient } from '@tanstack/svelte-query'
import { orpc as client, streamedOrpc as streamedClient } from '../../client/tests/shared'
import { createORPCSvelteQueryUtils } from '../src'

export const orpc = createORPCSvelteQueryUtils(client)
export const streamedOrpc = createORPCSvelteQueryUtils(streamedClient)

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: false,
    },
  },
})
