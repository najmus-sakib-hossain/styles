import type { AsyncIdQueueCloseOptions } from '@orpc/shared'
import type { StandardRequest, StandardResponse } from '@orpc/standard-server'
import type { EventIteratorPayload } from './codec'
import type { EncodedMessage, EncodedMessageSendFn } from './types'
import { AsyncIdQueue, isAsyncIteratorObject } from '@orpc/shared'
import { experimental_HibernationEventIterator, isEventIteratorHeaders } from '@orpc/standard-server'
import { decodeRequestMessage, encodeResponseMessage, MessageType } from './codec'
import { resolveEventIterator, toEventIterator } from './event-iterator'

export interface ServerPeerCloseOptions extends AsyncIdQueueCloseOptions {
  /**
   * Should abort or not?
   *
   * @default true
   */
  abort?: boolean
}

export class ServerPeer {
  private readonly clientEventIteratorQueue = new AsyncIdQueue<EventIteratorPayload>()
  private readonly clientControllers = new Map<string, AbortController>()

  private readonly send: (...args: Parameters<typeof encodeResponseMessage>) => Promise<void>

  constructor(
    send: EncodedMessageSendFn,
  ) {
    this.send = (id, ...rest) => encodeResponseMessage(id, ...rest).then(async (raw) => {
      // only send message if still open
      if (this.clientControllers.has(id)) {
        await send(raw)
      }
    })
  }

  get length(): number {
    return (
      this.clientEventIteratorQueue.length
      + this.clientControllers.size
    ) / 2
  }

  open(id: string): AbortController {
    this.clientEventIteratorQueue.open(id)
    const controller = new AbortController()
    this.clientControllers.set(id, controller)
    return controller
  }

  async message(raw: EncodedMessage): Promise<[id: string, StandardRequest | undefined]> {
    const [id, type, payload] = await decodeRequestMessage(raw)

    if (type === MessageType.ABORT_SIGNAL) {
      this.close({ id })
      return [id, undefined]
    }

    if (type === MessageType.EVENT_ITERATOR) {
      if (this.clientEventIteratorQueue.isOpen(id)) {
        this.clientEventIteratorQueue.push(id, payload)
      }
      return [id, undefined]
    }

    const clientController = this.open(id)

    const request: StandardRequest = {
      ...payload,
      signal: clientController.signal,
      body: isEventIteratorHeaders(payload.headers)
        ? toEventIterator(this.clientEventIteratorQueue, id, async (reason) => {
            if (reason !== 'next') {
              await this.send(id, MessageType.ABORT_SIGNAL, undefined)
            }
          })
        : payload.body,
    }

    return [id, request]
  }

  async response(id: string, response: StandardResponse): Promise<void> {
    const signal = this.clientControllers.get(id)?.signal

    // only send message if still open and not aborted
    if (!signal || signal.aborted) {
      return
    }

    await this.send(id, MessageType.RESPONSE, response)
      .then(async () => {
        if (!signal.aborted && isAsyncIteratorObject(response.body)) {
          if (response.body instanceof experimental_HibernationEventIterator) {
            response.body.hibernationCallback?.(id)
          }
          else {
            await resolveEventIterator(response.body, async (payload) => {
              if (signal.aborted) {
                return 'abort'
              }

              await this.send(id, MessageType.EVENT_ITERATOR, payload)

              return 'next'
            })
          }
        }

        this.close({ id, abort: false })
      })
      .catch((reason) => {
        this.close({ id, reason, abort: false })
        throw reason
      })
  }

  close({ abort = true, ...options }: ServerPeerCloseOptions = {}): void {
    if (options.id === undefined) {
      if (abort) {
        this.clientControllers.forEach(c => c.abort())
      }

      this.clientControllers.clear()
    }
    else {
      if (abort) {
        this.clientControllers.get(options.id)?.abort()
      }

      this.clientControllers.delete(options.id)
    }

    this.clientEventIteratorQueue.close(options)
  }
}
