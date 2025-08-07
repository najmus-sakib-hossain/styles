import { withEventMeta } from '@orpc/server'
import * as Hibernation from '@orpc/server/hibernation'
import { createCloudflareWebsocket, createDurableObjectState } from '../../tests/shared'
import { DURABLE_EVENT_ITERATOR_HIBERNATION_ID_KEY, DURABLE_EVENT_ITERATOR_TOKEN_PAYLOAD_KEY } from './consts'
import { DurableEventIteratorObjectEventStorage } from './event-storage'
import { DurableEventIteratorObjectWebsocketManager } from './websocket-manager'

const encodeHibernationRPCEventSpy = vi.spyOn(Hibernation, 'experimental_encodeHibernationRPCEvent')

beforeEach(() => {
  vi.clearAllMocks()
})

describe('durableEventIteratorObjectWebsocketManager', () => {
  it('serialize/deserialize attachment', () => {
    const ctx = createDurableObjectState()
    const storage = new DurableEventIteratorObjectEventStorage(ctx)
    const websocket = createCloudflareWebsocket()
    const manager = new DurableEventIteratorObjectWebsocketManager<any, any, any>(
      ctx,
      storage,
    )

    /**
     * Usually set hibernation happen after token payload, but this for test coverage
     */
    manager.serializeInternalAttachment(websocket, {
      [DURABLE_EVENT_ITERATOR_HIBERNATION_ID_KEY]: '0',
    })
    /**
     * Initial attachment, executed internally
     */
    manager.serializeInternalAttachment(websocket, {
      [DURABLE_EVENT_ITERATOR_TOKEN_PAYLOAD_KEY]: {
        att: { att: true },
        chn: 'test-channel',
        exp: 1923456789,
        iat: 1923456780,
        rpc: ['test'],
      },
    })
    // safely override the hibernation id
    manager.serializeInternalAttachment(websocket, {
      [DURABLE_EVENT_ITERATOR_HIBERNATION_ID_KEY]: '123',
    })

    manager.serializeAttachment(websocket, {
      some: 'data',
      [DURABLE_EVENT_ITERATOR_TOKEN_PAYLOAD_KEY]: 'invalid',
      [DURABLE_EVENT_ITERATOR_HIBERNATION_ID_KEY]: 'invalid',
    })

    expect(manager.deserializeAttachment(websocket)).toEqual({
      [DURABLE_EVENT_ITERATOR_TOKEN_PAYLOAD_KEY]: {
        att: { att: true },
        chn: 'test-channel',
        exp: 1923456789,
        iat: 1923456780,
        rpc: ['test'],
      },
      [DURABLE_EVENT_ITERATOR_HIBERNATION_ID_KEY]: '123',
      some: 'data',
    })
  })

  it('publish event', async () => {
    const ctx = createDurableObjectState()
    const storage = new DurableEventIteratorObjectEventStorage(ctx)
    const websocket = createCloudflareWebsocket()
    const websocket2 = createCloudflareWebsocket()
    const options = {
      customJsonSerializers: [],
    }

    const manager = new DurableEventIteratorObjectWebsocketManager<any, any, any>(
      ctx,
      storage,
      options,
    )

    /**
     * Initial attachment, executed internally
     */
    manager.serializeInternalAttachment(websocket, {
      [DURABLE_EVENT_ITERATOR_TOKEN_PAYLOAD_KEY]: {
        att: { att: true },
        chn: 'test-channel',
        exp: 1923456789,
        iat: 1923456780,
        rpc: ['test'],
      },
      [DURABLE_EVENT_ITERATOR_HIBERNATION_ID_KEY]: '123',
    })

    manager.serializeInternalAttachment(websocket2, {
      [DURABLE_EVENT_ITERATOR_TOKEN_PAYLOAD_KEY]: {
        att: { att: true },
        chn: 'test-channel',
        exp: 1923456789,
        iat: 1923456780,
        rpc: ['test'],
      },
    })

    const wss = [websocket, websocket2]
    manager.publishEvent(wss, { test: 'event1' })
    manager.publishEvent(wss, { test: 'event2' })

    expect(encodeHibernationRPCEventSpy).toHaveBeenCalledTimes(2)
    expect(encodeHibernationRPCEventSpy).toHaveBeenNthCalledWith(1, '123', withEventMeta({ test: 'event1' }, { id: '1' }), options)
    expect(encodeHibernationRPCEventSpy).toHaveBeenNthCalledWith(2, '123', withEventMeta({ test: 'event2' }, { id: '2' }), options)

    expect(storage.getEventsAfter('0')).toHaveLength(2)

    expect(websocket.send).toHaveBeenCalledTimes(2)
    expect(websocket.send).toHaveBeenNthCalledWith(1, encodeHibernationRPCEventSpy.mock.results[0]!.value)
    expect(websocket.send).toHaveBeenNthCalledWith(2, encodeHibernationRPCEventSpy.mock.results[1]!.value)

    // ignore websocket not having hibernation id
    expect(websocket2.send).toHaveBeenCalledTimes(0)
  })

  it('sendEventsAfter', async () => {
    const ctx = createDurableObjectState()
    const storage = new DurableEventIteratorObjectEventStorage(ctx)
    const websocket = createCloudflareWebsocket()
    const options = {
      customJsonSerializers: [],
    }

    const manager = new DurableEventIteratorObjectWebsocketManager<any, any, any>(
      ctx,
      storage,
      options,
    )

    storage.storeEvent({ test: 'event1' })
    storage.storeEvent({ test: 'event2' })
    storage.storeEvent({ test: 'event3' })

    manager.sendEventsAfter(websocket, '123', '1')

    expect(encodeHibernationRPCEventSpy).toHaveBeenCalledTimes(2)
    expect(encodeHibernationRPCEventSpy).toHaveBeenNthCalledWith(1, '123', withEventMeta({ test: 'event2' }, { id: '2' }), options)
    expect(encodeHibernationRPCEventSpy).toHaveBeenNthCalledWith(2, '123', withEventMeta({ test: 'event3' }, { id: '3' }), options)

    expect(websocket.send).toHaveBeenCalledTimes(2)
    expect(websocket.send).toHaveBeenNthCalledWith(1, encodeHibernationRPCEventSpy.mock.results[0]!.value)
    expect(websocket.send).toHaveBeenNthCalledWith(2, encodeHibernationRPCEventSpy.mock.results[1]!.value)
  })
})
