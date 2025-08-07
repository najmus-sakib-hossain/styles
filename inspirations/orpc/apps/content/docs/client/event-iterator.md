---
title: Event Iterator in oRPC Clients
description: Learn how to use event iterators in oRPC clients.
---

# Event Iterator in oRPC Clients

An [Event Iterator](/docs/event-iterator) in oRPC behaves like an [AsyncGenerator](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/AsyncGenerator).
Simply iterate over it and await each event.

## Basic Usage

```ts twoslash
import { ContractRouterClient, eventIterator, oc } from '@orpc/contract'
import * as z from 'zod'

const contract = {
  streaming: oc.output(eventIterator(z.object({ message: z.string() })))
}

declare const client: ContractRouterClient<typeof contract>
// ---cut---
const iterator = await client.streaming()

for await (const event of iterator) {
  console.log(event.message)
}
```

## Stopping the Stream Manually

Call `.return()` on the iterator to gracefully end the stream.

```ts
const iterator = await client.streaming()

for await (const event of iterator) {
  if (wantToStop) {
    await iterator.return()
    break
  }

  console.log(event.message)
}
```

## Error Handling

::: info
Unlike traditional SSE, the Event Iterator does not automatically retry on error. To enable automatic retries, refer to the [Client Retry Plugin](/docs/plugins/client-retry).
:::

```ts
const iterator = await client.streaming()

try {
  for await (const event of iterator) {
    console.log(event.message)
  }
}
catch (error) {
  if (error instanceof ORPCError) {
    // Handle the error here
  }
}
```

::: info
Errors thrown by the server can be instances of `ORPCError`.
:::
