---
title: Body Limit Plugin
description: A plugin for oRPC to limit the request body size.
---

# Body Limit Plugin

The **Body Limit Plugin** restricts the size of the request body.

## Import

Depending on your adapter, import the corresponding plugin:

```ts
import { BodyLimitPlugin } from '@orpc/server/fetch'
import { BodyLimitPlugin } from '@orpc/server/node'
```

## Setup

Configure the plugin with your desired maximum body size:

```ts
const handler = new RPCHandler(router, {
  plugins: [
    new BodyLimitPlugin({
      maxBodySize: 1024 * 1024, // 1MB
    }),
  ],
})
```
