---
title: Nuxt.js Adapter
description: Use oRPC inside an Nuxt.js project
---

# Nuxt.js Adapter

[Nuxt.js](https://nuxtjs.org/) is a popular Vue.js framework for building server-side applications. It built on top of [Nitro](https://nitro.build/) server a lightweight, high-performance Node.js runtime. For more details, see the [HTTP Adapter](/docs/adapters/http) guide.

## Server

You set up an oRPC server inside Nuxt using its [Server Routes](https://nuxt.com/docs/guide/directory-structure/server#server-routes).

::: code-group

```ts [server/routes/rpc/[...].ts]
import { RPCHandler } from '@orpc/server/node'

const handler = new RPCHandler(router)

export default defineEventHandler(async (event) => {
  const { matched } = await handler.handle(
    event.node.req,
    event.node.res,
    {
      prefix: '/rpc',
      context: {}, // Provide initial context if needed
    }
  )

  if (matched) {
    return
  }

  setResponseStatus(event, 404, 'Not Found')
  return 'Not found'
})
```

```ts [server/routes/rpc/index.ts]
export { default } from './[...]'
```

:::

::: info
The `handler` can be any supported oRPC handler, such as [RPCHandler](/docs/rpc-handler), [OpenAPIHandler](/docs/openapi/openapi-handler), or another custom handler.
:::

## Client

To make the oRPC client compatible with SSR, set it up inside a [Nuxt Plugin](https://nuxt.com/docs/guide/directory-structure/plugins).

```ts [plugins/orpc.ts]
export default defineNuxtPlugin(() => {
  const event = useRequestEvent()

  const link = new RPCLink({
    url: `${typeof window !== 'undefined' ? window.location.origin : 'http://localhost:3000'}/rpc`,
    headers: () => Object.fromEntries(event?.headers ?? []),
  })

  const client: RouterClient<typeof router> = createORPCClient(link)

  return {
    provide: {
      client,
    },
  }
})
```

:::info
You can learn more about client setup in [Client-Side Clients](/docs/client/client-side).
:::

## Optimize SSR

To reduce HTTP requests and improve latency during SSR, you can utilize a [Server-Side Client](/docs/client/server-side) during SSR. Below is a quick setup, see [Optimize SSR](/docs/best-practices/optimize-ssr) for more details.

::: code-group

```ts [plugins/orpc.client.ts]
export default defineNuxtPlugin(() => {
  const link = new RPCLink({
    url: `${window.location.origin}/rpc`,
    headers: () => ({}),
  })

  const client: RouterClient<typeof router> = createORPCClient(link)

  return {
    provide: {
      client,
    },
  }
})
```

```ts [plugins/orpc.server.ts]
export default defineNuxtPlugin((nuxt) => {
  const event = useRequestEvent()

  const client = createRouterClient(router, {
    context: {
      headers: event?.headers, // provide headers if initial context required
    },
  })

  return {
    provide: {
      client,
    },
  }
})
```

:::
