import { DurableEventIteratorObject } from '@orpc/experimental-durable-event-iterator/durable-object'
import { os } from '@orpc/server'
import * as z from 'zod'

export class ChatRoom extends DurableEventIteratorObject<{ message: string }> {
  publishMessageRPC() {
    return os
      .input(z.object({ message: z.string() }))
      .handler(({ input }) => {
        this.dei.websocketManager.publishEvent(this.ctx.getWebSockets(), input)
      })
      .callable()
  }

  publishMessage(message: string) {
    return this.dei.websocketManager.publishEvent(this.ctx.getWebSockets(), { message })
  }
}
