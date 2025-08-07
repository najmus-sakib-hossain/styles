---
title: Svelte Kit Adapter
description: Use oRPC inside an Svelte Kit project
---

# Svelte Kit Adapter

[Svelte Kit](https://svelte.dev/docs/kit/introduction) is a framework for rapidly developing robust, performant web applications using Svelte. For additional context, refer to the [HTTP Adapter](/docs/adapters/http) guide.

## Basic

::: code-group

```ts [src/routes/rpc/[...rest]/+server.ts]
import { error } from '@sveltejs/kit'
import { RPCHandler } from '@orpc/server/fetch'

const handler = new RPCHandler(router)

const handle: RequestHandler = async ({ request }) => {
  const { response } = await handler.handle(request, {
    prefix: '/rpc',
    context: {} // Provide initial context if needed
  })

  return response ?? new Response('Not Found', { status: 404 })
}

export const GET = handle
export const POST = handle
export const PUT = handle
export const PATCH = handle
export const DELETE = handle
```

:::

::: info
The `handler` can be any supported oRPC handler, such as [RPCHandler](/docs/rpc-handler), [OpenAPIHandler](/docs/openapi/openapi-handler), or another custom handler.
:::
