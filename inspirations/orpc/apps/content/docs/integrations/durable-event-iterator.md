---
title: Durable Event Iterator Integration
description: Allows you to use Event Iterator by separating the streaming to a different service that provides durable event streams, automatic reconnections, recovery of missing events, and more.
---

# Durable Event Iterator Integration

Durable Event Iterator allows you to use [Event Iterator](/docs/event-iterator) by separating the streaming to a different service that provides durable event streams, automatic reconnections, recovery of missing events, and more.

::: info
This feature is not limited to [Cloudflare Durable Objects](https://developers.cloudflare.com/durable-objects/), but it is approachable and currently the only supported option.
:::

## Installation

::: code-group

```sh [npm]
npm install @orpc/experimental-durable-event-iterator@latest
```

```sh [yarn]
yarn add @orpc/experimental-durable-event-iterator@latest
```

```sh [pnpm]
pnpm add @orpc/experimental-durable-event-iterator@latest
```

```sh [bun]
bun add @orpc/experimental-durable-event-iterator@latest
```

```sh [deno]
deno install npm:@orpc/experimental-durable-event-iterator@latest
```

:::

::: warning
The `experimental-` prefix indicates that this feature is still in development and may change in the future.
:::

## Setup your Durable Object

::: warning
This section requires you to be familiar with [Cloudflare Durable Objects](https://developers.cloudflare.com/durable-objects/). Please learn it first before continuing.
:::

### Define your Durable Object

Everything you need to do is extend the `DurableEventIteratorObject` class. Additionally, you can define [RPC Methods](https://developers.cloudflare.com/durable-objects/best-practices/create-durable-object-stubs-and-send-requests/) to publish events to the connected clients.

```ts
import { DurableEventIteratorObject } from '@orpc/experimental-durable-event-iterator/durable-object'

export class ChatRoom extends DurableEventIteratorObject<{ message: string }> {
  constructor(ctx: DurableObjectState, env: Env) {
    super(ctx, env, {
      eventRetentionSeconds: 300, // Optional: Set the event retention duration (default is 5 minutes)
      customJsonSerializers: [
        // Custom JSON serializers
      ]
    })
  }

  publishMessage(message: string) {
    this.dei.websocketManager.publishEvent(this.ctx.getWebSockets(), { message })
  }
}
```

::: warning
Do not use [WebSocket Extended Methods](https://developers.cloudflare.com/durable-objects/best-practices/websockets/#extended-methods) like `ws.serializeAttachment` and `ws.deserializeAttachment` directly because you may interfere with the attachment that durable event iterator relies on. Instead, you should use the `serializeAttachment` and `deserializeAttachment` methods inside `dei.websocketManager`.
:::

### Upgrade Durable Event Iterator Request

This step will upgrade and validate the WebSocket request to your Durable Object. You need to provide a signing key to validate the token and the corresponding Durable Object namespace.

```ts
import { upgradeDurableEventIteratorRequest } from '@orpc/experimental-durable-event-iterator/durable-object'

export default {
  async fetch(request, env) {
    const url = new URL(request.url)

    if (url.pathname === '/chat-room') {
      return upgradeDurableEventIteratorRequest(request, {
        signingKey: 'secret-key', // Replace with your actual signing key
        namespace: env.CHAT_ROOM,
      })
    }

    return new Response('Not Found', { status: 404 })
  },
} satisfies ExportedHandler<Env>

export { ChatRoom }
```

## Server Side Usage

Here we define two procedures: one for listening to messages in the chat room, and another for sending messages to all connected clients by invoking the `publishMessage` method on the Durable Object.

::: info
This example assumes your server and Durable Object are running in the same environment, but this is not required. Instead of invoking the `publishMessage` method directly, you can send a fetch request to wherever your Durable Object is running to send messages.
:::

```ts
import { DurableEventIterator } from '@orpc/experimental-durable-event-iterator'

export const router = {
  onMessage: base.handler(({ context }) => {
    return new DurableEventIterator<ChatRoom>('some-room', {
      signingKey: 'secret-key', // Replace with your actual signing key
    })
  }),

  sendMessage: base
    .input(z.object({ message: z.string() }))
    .handler(async ({ context, input }) => {
      const id = context.env.CHAT_ROOM.idFromName('some-room')
      const stub = context.env.CHAT_ROOM.get(id)

      await stub.publishMessage(input.message)
    }),
}
```

After that, you need to use `DurableEventIteratorHandlerPlugin` in your handler to enable Durable Event Iterator support.

```ts
import { DurableEventIteratorHandlerPlugin } from '@orpc/experimental-durable-event-iterator'

const handler = new RPCHandler(router, {
  plugins: [
    new DurableEventIteratorHandlerPlugin(),
  ],
})
```

## Client Side Usage

On the client side, you only need to set up the plugin. The rest is the same as [Event Iterator](/docs/client/event-iterator). The `url` you define inside `DurableEventIteratorLinkPlugin` is the URL of your Durable Object upgrade endpoint.

```ts
import { DurableEventIteratorLinkPlugin } from '@orpc/experimental-durable-event-iterator/client'

const link = new RPCLink({
  url: 'http://localhost:3000/rpc',
  plugins: [
    new DurableEventIteratorLinkPlugin({
      url: 'ws://localhost:3000/chat-room',
    }),
  ],
})
```

### Example

```ts
const iterator = await client.onMessage()

for await (const { message } of iterator) {
  console.log('Received message:', message)
}

await client.sendMessage({ message: 'Hello, world!' })
```

## Recovery of Missing Events

The Durable Event Iterator automatically persists events for 5 minutes and recovers missed events when clients connect/reconnect, ensuring reliable message delivery even during network interruptions.
You can use the `eventRetentionSeconds` option to change the retention duration.

## Durable Objects RPC

Unlike the [Cloudflare Durable Objects RPC](https://developers.cloudflare.com/durable-objects/best-practices/create-durable-object-stubs-and-send-requests/), this RPC utilizes oRPC built-in RPC system, allowing clients to easily interact with Durable Objects directly. To use it, you need to define methods that accept a `WebSocket` instance as the first argument and return an [oRPC Client](/docs/client/server-side).

```ts
import { DurableEventIteratorObject } from '@orpc/experimental-durable-event-iterator/durable-object'

export class ChatRoom extends DurableEventIteratorObject<
  { message: string }, // Event type
  { userId: string }, // (Optional) Token Attachment
  { something: string }
> {
  publishMessage(currentWs: WebSocket) {
    return base
      .input(z.object({ message: z.string() }))
      .handler(({ input, context }) => {
        // Get attachments
        const wsAttachment = this.dei.websocketManager.deserializeAttachment(currentWs)
        const { userId } = wsAttachment['dei:token:payload'].att
        const something = wsAttachment.something

        // Set attachments
        this.dei.websocketManager.serializeAttachment(currentWs, {
          something: 'new value',
        })

        // Publish event to all other connected clients
        this.dei.websocketManager.publishEvent(
          this.ctx.getWebSockets().filter(ws => ws !== currentWs),
          input,
        )
      })
      .callable()
  }

  /**
   * Nested Client
   */
  router(ws: WebSocket) {
    return {
      ping: base.handler(() => 'pong').callable(),
      echo: base
        .input(z.object({ text: z.string() }))
        .handler(({ input }) => `Echo: ${input.text}`)
        .callable(),
    }
  }
}
```

### Server Side Usage

```ts
import { DurableEventIterator } from '@orpc/experimental-durable-event-iterator'

export const onMessage = base.handler(({ context }) => {
  return new DurableEventIterator<ChatRoom>('some-room', {
    signingKey: 'secret-key', // Replace with your actual signing key
    att: {
      userId: 'user-123', // User-specific data
    },
  }).rpc('publishMessage', 'router') // List of allowed methods
})
```

::: info
Clients only have permission to call the methods you defined in the `rpc` method. This provides fine-grained access control.
:::

::: warning
The `att` (attachment) data can be viewed from the client side, so do not put any sensitive data in it. Use it only for non-sensitive metadata like user IDs or preferences.
:::

### Client Side Usage

You can invoke methods defined inside `rpc` directly from the client `iterator` result.

```ts
const iterator = await client.onMessage()

// Listen for events
for await (const { message } of iterator) {
  console.log('Received message:', message)
}

// Call RPC methods
await iterator.publishMessage({ message: 'Hello, world!' })

// Call nested router methods
const response = await iterator.router.ping()
console.log(response) // "pong"

const echoResponse = await iterator.router.echo({ text: 'Hello' })
console.log(echoResponse) // "Echo: Hello"
```

## Contract First

This integration also supports [Contract First](/docs/contract-first/define-contract). What you need to do is define an interface that extends `DurableEventIteratorObject`.

```ts
import type { ContractRouterClient } from '@orpc/contract'
import { oc, type } from '@orpc/contract'
import type { ClientDurableEventIterator } from '@orpc/experimental-durable-event-iterator/client'
import type { DurableEventIteratorObject } from '@orpc/experimental-durable-event-iterator'

export const publishMessageContract = oc.input(z.object({ message: z.string() }))

export interface ChatRoom extends DurableEventIteratorObject<{ message: string }> {
  publishMessage(...args: any[]): ContractRouterClient<typeof publishMessageContract>
}

export const contract = {
  onMessage: oc.output(type<ClientDurableEventIterator<ChatRoom, 'publishMessage'>>()),
}
```
