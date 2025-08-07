import type { StandardRPCJsonSerializerOptions } from '@orpc/client/standard'
import type { TokenAttachment } from '../object'
import type { DurableEventIteratorTokenPayload } from '../schemas'
import type { DurableEventIteratorObjectEventStorage } from './event-storage'
import { experimental_encodeHibernationRPCEvent as encodeHibernationRPCEvent } from '@orpc/server/hibernation'
import { DURABLE_EVENT_ITERATOR_HIBERNATION_ID_KEY, DURABLE_EVENT_ITERATOR_TOKEN_PAYLOAD_KEY } from './consts'

export interface DurableEventIteratorObjectWebsocketManagerOptions extends StandardRPCJsonSerializerOptions {
}

export type DurableEventIteratorObjectWebsocketInternalAttachment<
  TTokenAttachment,
> = {
  /**
   * Internal Hibernation Event Iterator ID.
   */
  [DURABLE_EVENT_ITERATOR_HIBERNATION_ID_KEY]?: string

  /**
   * The payload of the Token used to authenticate the WebSocket connection.
   */
  [DURABLE_EVENT_ITERATOR_TOKEN_PAYLOAD_KEY]: Omit<DurableEventIteratorTokenPayload, 'att'> & {
    att: TTokenAttachment
  }
}

export type DurableEventIteratorObjectWebsocketAttachment
  = Record<string | number, unknown>
    & {
      [K in keyof DurableEventIteratorObjectWebsocketInternalAttachment<any>]?: never
    }

export class DurableEventIteratorObjectWebsocketManager<
  TEventPayload extends object,
  TTokenAttachment extends TokenAttachment,
  TWsAttachment extends DurableEventIteratorObjectWebsocketAttachment,
> {
  constructor(
    private readonly ctx: DurableObjectState,
    private readonly eventStorage: DurableEventIteratorObjectEventStorage<TEventPayload>,
    private readonly options: DurableEventIteratorObjectWebsocketManagerOptions = {},
  ) {}

  publishEvent(wss: readonly WebSocket[], payload: TEventPayload): void {
    payload = this.eventStorage.storeEvent(payload)

    for (const ws of wss) {
      const attachment = this.deserializeAttachment(ws)
      const hibernationEventIteratorId = attachment?.[DURABLE_EVENT_ITERATOR_HIBERNATION_ID_KEY]

      if (hibernationEventIteratorId === undefined) {
        // Maybe the connection not finished the subscription process yet
        continue
      }

      ws.send(encodeHibernationRPCEvent(hibernationEventIteratorId, payload, this.options))
    }
  }

  /**
   * This useful when the client connects/reconnects, we need to send all events
   * that happened while the connection is estimated.
   *
   * @param ws
   * @param hibernationId
   * @param after - The last event id or date after which to send events.
   */
  sendEventsAfter(
    ws: WebSocket,
    hibernationId: string,
    after: string | Date,
  ): void {
    const events = this.eventStorage.getEventsAfter(after)

    for (const event of events) {
      ws.send(encodeHibernationRPCEvent(hibernationId, event, this.options))
    }
  }

  serializeAttachment(ws: WebSocket, attachment: TWsAttachment): void {
    const old = this.deserializeAttachment(ws)

    ws.serializeAttachment({
      ...attachment,
      [DURABLE_EVENT_ITERATOR_HIBERNATION_ID_KEY]: old[DURABLE_EVENT_ITERATOR_HIBERNATION_ID_KEY],
      [DURABLE_EVENT_ITERATOR_TOKEN_PAYLOAD_KEY]: old[DURABLE_EVENT_ITERATOR_TOKEN_PAYLOAD_KEY],
    })
  }

  serializeInternalAttachment(ws: WebSocket, attachment: Partial<DurableEventIteratorObjectWebsocketInternalAttachment<TTokenAttachment>>): void {
    const old = this.deserializeAttachment(ws)

    ws.serializeAttachment({
      ...old,
      [DURABLE_EVENT_ITERATOR_HIBERNATION_ID_KEY]: attachment[DURABLE_EVENT_ITERATOR_HIBERNATION_ID_KEY] ?? old?.[DURABLE_EVENT_ITERATOR_HIBERNATION_ID_KEY],
      [DURABLE_EVENT_ITERATOR_TOKEN_PAYLOAD_KEY]: attachment[DURABLE_EVENT_ITERATOR_TOKEN_PAYLOAD_KEY] ?? old?.[DURABLE_EVENT_ITERATOR_TOKEN_PAYLOAD_KEY],
    })
  }

  deserializeAttachment(ws: WebSocket): DurableEventIteratorObjectWebsocketInternalAttachment<TTokenAttachment> & Omit<TWsAttachment, keyof DurableEventIteratorObjectWebsocketInternalAttachment<TTokenAttachment>> {
    return ws.deserializeAttachment()
  }
}
