import { SignJWT } from 'jose'
import { DURABLE_EVENT_ITERATOR_TOKEN_PAYLOAD_KEY } from './consts'
import { upgradeDurableEventIteratorRequest } from './upgrade'

describe('upgradeDurableEventIteratorRequest', () => {
  it('reject non-websocket upgrade', async () => {
    const response = await upgradeDurableEventIteratorRequest(
      new Request('https://example.com'),
      {
        namespace: {} as any,
        signingKey: 'test-sign',
      },
    )

    expect(response.status).toBe(426)
  })

  it('rejects missing token', async () => {
    const response = await upgradeDurableEventIteratorRequest(
      new Request('https://example.com', {
        headers: { upgrade: 'websocket' },
      }),
      {
        namespace: {} as any,
        signingKey: 'test-sign',
      },
    )

    expect(response.status).toBe(401)
  })

  it('rejects invalid token', async () => {
    const response = await upgradeDurableEventIteratorRequest(
      new Request('https://example.com?token=invalid-token', {
        headers: { upgrade: 'websocket' },
      }),
      {
        namespace: {} as any,
        signingKey: 'test-sign',
      },
    )

    expect(response.status).toBe(401)
  })

  it('rejects invalid payload', async () => {
    const jwt = await new SignJWT({ invalid: true })
      .setProtectedHeader({ alg: 'HS256' })
      .setIssuedAt()
      .setExpirationTime(new Date(Date.now() + 1000 * 1000))
      .sign(new TextEncoder().encode('test-sign'))
    const response = await upgradeDurableEventIteratorRequest(
      new Request(`https://example.com?token=${jwt}`, {
        headers: { upgrade: 'websocket' },
      }),
      {
        namespace: {} as any,
        signingKey: 'test-sign',
      },
    )

    expect(response.status).toBe(401)
  })

  it('upgrades valid request', async () => {
    const namespace = {
      idFromName: vi.fn((name: string) => new TextEncoder().encode(name)),
      get: vi.fn(() => ({
        fetch: vi.fn(() => new Response('WebSocket Upgrade Successful')),
      })),
    }

    const date = 1244444444444

    const jwt = await new SignJWT({
      chn: 'test-channel',
      rpc: ['someMethod'],
      att: { some: 'attachment' },
    })
      .setProtectedHeader({ alg: 'HS256' })
      .setIssuedAt(date)
      .setExpirationTime(date)
      .sign(new TextEncoder().encode('test-sign'))

    const response = await upgradeDurableEventIteratorRequest(
      new Request(`https://example.com?token=${jwt}`, {
        headers: { upgrade: 'websocket' },
      }),
      {
        namespace: namespace as any,
        signingKey: 'test-sign',
      },
    )

    expect(await response.text()).toEqual('WebSocket Upgrade Successful')

    expect(namespace.idFromName).toHaveBeenCalledWith('test-channel')
    expect(namespace.get).toHaveBeenCalledWith(namespace.idFromName.mock.results[0]!.value)
    const stub = namespace.get.mock.results[0]!.value
    const requestUrl = new URL(stub.fetch.mock.calls[0][0])
    const requestHeaders = stub.fetch.mock.calls[0][1].headers

    expect(JSON.parse(requestUrl.searchParams.get(DURABLE_EVENT_ITERATOR_TOKEN_PAYLOAD_KEY)!)).toEqual({
      chn: 'test-channel',
      rpc: ['someMethod'],
      att: { some: 'attachment' },
      iat: date,
      exp: date,
    })

    expect(requestHeaders.get('upgrade')).toBe('websocket')
  })
})
