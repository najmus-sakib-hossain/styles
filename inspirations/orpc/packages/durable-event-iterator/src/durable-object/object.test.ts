import { encodeRequestMessage, MessageType } from '@orpc/standard-server-peer'
import { createCloudflareWebsocket, createDurableObjectState } from '../../tests/shared'
import { DURABLE_EVENT_ITERATOR_TOKEN_PAYLOAD_KEY } from './consts'
import { DurableEventIteratorObject } from './object'

vi.mock('cloudflare:workers', () => ({
  DurableObject: class {
    constructor(
      protected readonly ctx: any,
      protected readonly env: unknown,
    ) {}
  },
}))

beforeAll(() => {
  (globalThis as any).WebSocketPair = vi.fn(() => ({
    0: createCloudflareWebsocket(),
    1: createCloudflareWebsocket(),
  }))

  const globalResponse = globalThis.Response

  ;(globalThis as any).Response = class extends globalResponse {
    readonly __init: any

    constructor(input: any, init?: any) {
      super(input, {
        ...init,
        status: 200,
      })

      this.__init = init
    }
  }

  ;(globalThis as any).__rest = (s: any, e: any) => {
    ; (globalThis as any).WebSocketPair = undefined
    ;(globalThis as any).Response = globalResponse
  }
})

beforeEach(() => {
  vi.clearAllMocks()
})

afterAll(() => {
  ; (globalThis as any).__rest()
  ; (globalThis as any).__rest = undefined
})

describe('durableEventIteratorObject', () => {
  it('upgrade websocket connection', async () => {
    const ctx = createDurableObjectState()
    const object = new DurableEventIteratorObject(ctx, {})

    const tokenPayload = {
      att: { some: 'attachment' },
      iat: 144434837,
      exp: 144434937,
      chn: 'test-channel',
      rpc: ['someMethod'],
    }

    const url = new URL('https://example.com')
    url.searchParams.set(DURABLE_EVENT_ITERATOR_TOKEN_PAYLOAD_KEY, JSON.stringify(tokenPayload))

    const response = await object.fetch(new Request(url))

    expect((globalThis as any).WebSocketPair).toHaveBeenCalledTimes(1)
    const { 0: client, 1: server } = (globalThis as any).WebSocketPair.mock.results[0].value
    expect(ctx.acceptWebSocket).toHaveBeenCalledTimes(1)
    expect(ctx.acceptWebSocket).toHaveBeenCalledWith(server)

    expect(response).instanceOf(Response)
    expect((response as any).__init.status).toBe(101)
    expect((response as any).__init.webSocket).toBe(client)
    expect(server.deserializeAttachment()).toEqual({
      [DURABLE_EVENT_ITERATOR_TOKEN_PAYLOAD_KEY]: tokenPayload,
    })
  })

  it('webSocketMessage', async () => {
    const ctx = createDurableObjectState()
    const object = new DurableEventIteratorObject(ctx, {})
    const currentWebsocket = createCloudflareWebsocket()

    const request = await encodeRequestMessage('123', MessageType.REQUEST, {
      url: new URL('https://example.com'),
      headers: {
        'content-type': 'text/event-stream',
      },
      body: undefined,
      method: 'POST',
    })

    await object.webSocketMessage(currentWebsocket, request)
    expect(currentWebsocket.send).toHaveBeenCalledTimes(1)
  })

  it('webSocketClose', async () => {
    const ctx = createDurableObjectState()
    const object = new DurableEventIteratorObject(ctx, {})
    const currentWebsocket = createCloudflareWebsocket()
    object.webSocketClose(currentWebsocket, 1, 'reason', true)
  })
})
