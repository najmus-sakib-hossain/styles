import type { AsyncIdQueueCloseOptions } from '@orpc/shared'
import type { StandardRequest, StandardResponse } from '@orpc/standard-server'
import type { EventIteratorPayload } from './codec'
import type { EncodedMessage, EncodedMessageSendFn } from './types'
import { AsyncIdQueue, isAsyncIteratorObject, SequentialIdGenerator } from '@orpc/shared'
import { isEventIteratorHeaders } from '@orpc/standard-server'
import { decodeResponseMessage, encodeRequestMessage, MessageType } from './codec'
import { resolveEventIterator, toEventIterator } from './event-iterator'

export interface ClientPeerCloseOptions extends AsyncIdQueueCloseOptions {
  /**
   * Should abort or not?
   *
   * @default true
   */
  abort?: boolean
}

export class ClientPeer {
  private readonly idGenerator = new SequentialIdGenerator()

  private readonly responseQueue = new AsyncIdQueue<StandardResponse>()
  private readonly serverEventIteratorQueue = new AsyncIdQueue<EventIteratorPayload>()
  private readonly serverControllers = new Map<string, AbortController>()

  private readonly send: (...args: Parameters<typeof encodeRequestMessage>) => Promise<void>

  constructor(
    send: EncodedMessageSendFn,
  ) {
    this.send = async (id, ...rest) => encodeRequestMessage(id, ...rest).then(async (raw) => {
      // only send message if still open
      if (this.serverControllers.has(id)) {
        await send(raw)
      }
    })
  }

  get length(): number {
    return (
      +this.responseQueue.length
      + this.serverEventIteratorQueue.length
      + this.serverControllers.size
    ) / 3
  }

  open(id: string): AbortController {
    this.serverEventIteratorQueue.open(id)
    this.responseQueue.open(id)
    const controller = new AbortController()
    this.serverControllers.set(id, controller)
    return controller
  }

  async request(request: StandardRequest): Promise<StandardResponse> {
    const signal = request.signal

    if (signal?.aborted) {
      throw signal.reason
    }

    const id = this.idGenerator.generate()

    const serverController = this.open(id)

    return new Promise((resolve, reject) => {
      this.send(id, MessageType.REQUEST, request)
        .then(async () => {
          if (signal?.aborted) {
            await this.send(id, MessageType.ABORT_SIGNAL, undefined)
            this.close({ id, reason: signal.reason })
            return
          }

          signal?.addEventListener('abort', async () => {
            await this.send(id, MessageType.ABORT_SIGNAL, undefined)
            this.close({ id, reason: signal.reason })
          }, { once: true })

          if (isAsyncIteratorObject(request.body)) {
            await resolveEventIterator(request.body, async (payload) => {
              if (serverController.signal.aborted) {
                return 'abort'
              }

              await this.send(id, MessageType.EVENT_ITERATOR, payload)

              return 'next'
            })
          }
        })
        .catch((err) => {
          this.close({ id, reason: err })
          reject(err)
        })

      this.responseQueue.pull(id)
        .then(resolve)
        .catch(reject)
    })
  }

  async message(raw: EncodedMessage): Promise<void> {
    const [id, type, payload] = await decodeResponseMessage(raw)

    if (type === MessageType.ABORT_SIGNAL) {
      this.serverControllers.get(id)?.abort()
      return
    }

    if (type === MessageType.EVENT_ITERATOR) {
      if (this.serverEventIteratorQueue.isOpen(id)) {
        this.serverEventIteratorQueue.push(id, payload)
      }

      return
    }

    if (!this.responseQueue.isOpen(id)) {
      return
    }

    if (isEventIteratorHeaders(payload.headers)) {
      this.responseQueue.push(id, {
        ...payload,
        body: toEventIterator(this.serverEventIteratorQueue, id, async (reason) => {
          try {
            if (reason !== 'next') {
              await this.send(id, MessageType.ABORT_SIGNAL, undefined)
            }
          }
          finally {
            this.close({ id })
          }
        }),
      })
    }
    else {
      this.responseQueue.push(id, payload)
      this.close({ id })
    }
  }

  close(options: AsyncIdQueueCloseOptions = {}): void {
    if (options.id !== undefined) {
      this.serverControllers.get(options.id)?.abort(options.reason)
      this.serverControllers.delete(options.id)
    }
    else {
      this.serverControllers.forEach(c => c.abort(options.reason))
      this.serverControllers.clear()
    }

    this.responseQueue.close(options)
    this.serverEventIteratorQueue.close(options)
  }
}
