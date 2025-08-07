import { QueryClient } from '@tanstack/react-query'
import { orpc as client, streamedOrpc as streamedClient } from '../../client/tests/shared'
import { createTanstackQueryUtils } from '../src'

export const orpc = createTanstackQueryUtils(client)
export const streamedOrpc = createTanstackQueryUtils(streamedClient)

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: false,
    },
  },
})
