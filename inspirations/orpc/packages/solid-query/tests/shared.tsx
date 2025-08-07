import { QueryClient } from '@tanstack/solid-query'
import { orpc as client, streamedOrpc as streamedClient } from '../../client/tests/shared'
import { createORPCSolidQueryUtils } from '../src'

export const orpc = createORPCSolidQueryUtils(client)
export const streamedOrpc = createORPCSolidQueryUtils(streamedClient)

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: false,
    },
  },
})
