---
title: OpenAPI Reference Plugin (Swagger/Scalar)
description: A plugin that serves API reference documentation and the OpenAPI specification for your API.
---

# OpenAPI Reference Plugin (Swagger/Scalar)

This plugin provides API reference documentation powered by [Scalar](https://github.com/scalar/scalar), along with the OpenAPI specification in JSON format.

::: info
This plugin relies on the [OpenAPI Generator](/docs/openapi/openapi-specification). Please review its documentation before using this plugin.
:::

## Setup

```ts
import { ZodToJsonSchemaConverter } from '@orpc/zod/zod4'
import { OpenAPIReferencePlugin } from '@orpc/openapi/plugins'

const handler = new OpenAPIHandler(router, {
  plugins: [
    new OpenAPIReferencePlugin({
      schemaConverters: [
        new ZodToJsonSchemaConverter(),
      ],
      specGenerateOptions: {
        info: {
          title: 'ORPC Playground',
          version: '1.0.0',
        },
      },
    }),
  ]
})
```

::: info
By default, the API reference client is served at the root path (`/`), and the OpenAPI specification is available at `/spec.json`. You can customize these paths by providing the `docsPath` and `specPath` options.
:::
