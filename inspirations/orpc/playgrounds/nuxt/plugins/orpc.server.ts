import { createRouterClient } from '@orpc/server'
import { router } from '~/server/router'
import { createTanstackQueryUtils } from '@orpc/tanstack-query'

/**
 * This is part of the Optimize SSR setup.
 *
 * @see {@link https://orpc.unnoq.com/docs/adapters/nuxt#optimize-ssr}
 */
export default defineNuxtPlugin((nuxt) => {
  const event = useRequestEvent()

  const client = createRouterClient(router, {
    context: {
      // headers: event?.headers, // provide headers if initial context required
    },
  })

  const orpc = createTanstackQueryUtils(client)

  return {
    provide: {
      orpc,
    },
  }
})
