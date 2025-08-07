import { QueryClient } from '@tanstack/vue-query'
import { orpc as client, streamedOrpc as streamedClient } from '../../client/tests/shared'
import { createORPCVueQueryUtils } from '../src'

export const orpc = createORPCVueQueryUtils(client)
export const streamedOrpc = createORPCVueQueryUtils(streamedClient)

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: false,
    },
  },
})
