import { http, HttpResponse } from 'msw'
import { setupServer } from 'msw/node'
import { client } from '../tests/client/client.gen'
import * as sdk from '../tests/client/sdk.gen'
import { experimental_toORPCClient } from './to-orpc-client'

client.setConfig({
  baseUrl: 'https://example.com',
})

const server = setupServer(
  http.get('https://example.com/planets', (req) => {
    if (req.request.url.includes('throwOnError=1')) {
      return HttpResponse.json(null, { status: 500 })
    }

    return HttpResponse.json([{ id: 'earth', name: 'Earth' }], {
      headers: {
        'X-Rate-Limit': '10',
        'Last-Event-ID': req.request.headers.get('Last-Event-ID') ?? 'EMPTY',
      },
    })
  }),
  http.post('https://example.com/planets', async (req) => {
    const body = await req.request.json() as any
    return HttpResponse.json({ id: body.name, name: body.name })
  }),
  http.get('https://example.com/planets/:planetId', (req) => {
    return HttpResponse.json({ id: req.params.planetId, name: req.params.planetId })
  }),
)

beforeAll(() => server.listen({ onUnhandledRequest: 'error' }))

afterEach(() => server.resetHandlers())

afterAll(() => server.close())

describe('toORPCClient', () => {
  const client = experimental_toORPCClient({
    ...sdk,
    somethingElse: 123,
  })

  it('should ignore non-function properties', () => {
    expect(client.somethingElse).toBeUndefined()
  })

  it('works', async () => {
    const result = await client.planetList()
    expect(result).toEqual({
      body: [{ id: 'earth', name: 'Earth' }],
      request: expect.any(Request),
      response: expect.any(Response),
    })
  })

  it('with lastEventId', async () => {
    const result = await client.planetList({
      headers: {
        'x-something': 'value',
        'last-event-id': '123',
      },
    }, { lastEventId: '456' })

    expect(result.request.headers.get('x-something')).toBe('value')
    expect(result.request.headers.get('last-event-id')).toBe('456')
    expect(result.response.headers.get('last-event-id')).toBe('456')
  })

  it('with query', async () => {
    const result = await client.planetList({
      query: {
        limit: 10,
        offset: 0,
      },
    })

    expect(result.request.url).toBe('https://example.com/planets?limit=10&offset=0')
    expect(result.body).toEqual([{ id: 'earth', name: 'Earth' }])
  })

  it('with params', async () => {
    const result = await client.getPlanet({
      path: { planetId: 'earth' },
    })

    expect(result.request.url).toBe('https://example.com/planets/earth')
    expect(result.body).toEqual({ id: 'earth', name: 'earth' })
  })

  it('with body', async () => {
    const result = await client.planetCreate({
      body: { name: 'Bob' },
    })

    expect(result.body).toEqual({ id: 'Bob', name: 'Bob' })
  })

  describe('abort signal', () => {
    it('case 1', async () => {
      const controller1 = new AbortController()
      const controller2 = new AbortController()

      const result = await client.planetCreate({
        body: { name: 'Bob' },
        signal: controller1.signal,
      }, { signal: controller2.signal })

      expect(result.request.signal.aborted).toEqual(false)
      controller1.abort()
      expect(result.request.signal.aborted).toEqual(true)
    })

    it('case 2', async () => {
      const controller1 = new AbortController()
      const controller2 = new AbortController()

      const result = await client.planetCreate({
        body: { name: 'Bob' },
        signal: controller1.signal,
      }, { signal: controller2.signal })

      expect(result.request.signal.aborted).toEqual(false)
      controller2.abort()
      expect(result.request.signal.aborted).toEqual(true)
    })

    it('case 3', async () => {
      const controller1 = new AbortController()
      const controller2 = new AbortController()
      controller1.abort()

      await expect(
        client.planetCreate({
          body: { name: 'Bob' },
          signal: controller1.signal,
        }, { signal: controller2.signal }),
      ).rejects.toThrowError('This operation was aborted')
    })

    it('case 4', async () => {
      const controller1 = new AbortController()
      const controller2 = new AbortController()
      controller2.abort()

      await expect(
        client.planetCreate({
          body: { name: 'Bob' },
          signal: controller1.signal,
        }, { signal: controller2.signal }),
      ).rejects.toThrowError('This operation was aborted')
    })
  })

  it('throws on error', async () => {
    await expect(client.planetList({ query: { throwOnError: 1 } as any })).rejects.toThrowError()
  })
})
