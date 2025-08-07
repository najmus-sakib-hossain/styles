---
title: Customizing Error Response Format
description: Learn how to customize the error response format in oRPC OpenAPI handlers to match your application's requirements and improve client compatibility.
---

# Customizing Error Response Format

If you need to customize the error response format to match your application's requirements, you can use [`rootInterceptors`](/docs/rpc-handler#lifecycle) in the handler.

::: warning
Avoid combining this with [Type‑Safe Error Handling](/docs/error-handling#type‐safe-error-handling), as the [OpenAPI Specification Generator](/docs/openapi/openapi-specification) does not yet support custom error response formats.
:::

```ts
import { isORPCErrorJson, isORPCErrorStatus } from '@orpc/client'

const handler = new OpenAPIHandler(router, {
  rootInterceptors: [
    async ({ next }) => {
      const result = await next()

      if (
        result.matched
        && isORPCErrorStatus(result.response.status)
        && isORPCErrorJson(result.response.body)
      ) {
        return {
          ...result,
          response: {
            ...result.response,
            body: {
              ...result.response.body,
              message: 'custom error shape',
            },
          },
        }
      }

      return result
    },
  ],
})
```
