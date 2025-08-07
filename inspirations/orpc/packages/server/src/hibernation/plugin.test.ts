import { experimental_HibernationEventIterator as HibernationEventIterator } from '@orpc/standard-server'
import { StandardRPCHandler } from '../adapters/standard'
import { os } from '../builder'
import { experimental_HibernationPlugin as HibernationPlugin } from './plugin'

beforeEach(() => {
  vi.resetAllMocks()
})

describe('hibernationPlugin', async () => {
  const callback = vi.fn()
  const interceptor = vi.fn(({ next }) => next())

  const handler = new StandardRPCHandler({
    ping: os.handler(() => new HibernationEventIterator(callback)),
    pong: os.handler(() => 'pong'),
  }, {
    plugins: [
      new HibernationPlugin(),
    ],
    interceptors: [
      interceptor,
    ],
  })

  it('set body as HibernationEventIterator if output is HibernationEventIterator', async () => {
    const { response } = await handler.handle({
      url: new URL('http://localhost/ping'),
      method: 'POST',
      body: () => Promise.resolve(JSON.stringify({})),
      headers: {},
      signal: undefined,
    }, {
      context: {},
    })

    expect(response!.status).toBe(200)
    expect(response!.body).toBeInstanceOf(HibernationEventIterator)
  })

  it('do nothing if output is not HibernationEventIterator', async () => {
    const { response } = await handler.handle({
      url: new URL('http://localhost/pong'),
      method: 'POST',
      body: () => Promise.resolve(JSON.stringify({})),
      headers: {},
      signal: undefined,
    }, {
      context: {},
    })

    expect(response!.status).toBe(200)
    expect(response!.body).toEqual({ json: 'pong' })
  })

  it('do nothing if not matched', async () => {
    const { matched } = await handler.handle({
      url: new URL('http://localhost/not-found'),
      method: 'POST',
      body: () => Promise.resolve(JSON.stringify({})),
      headers: {},
      signal: undefined,
    }, {
      context: {},
    })

    expect(matched).toBe(false)
  })

  it('error if Hibernation context is corrupted', async () => {
    interceptor.mockImplementationOnce(({ next, ...options }) => next({ ...options, context: {} }))

    const { response } = await handler.handle({
      url: new URL('http://localhost/ping'),
      method: 'POST',
      body: () => Promise.resolve(JSON.stringify({})),
      headers: {},
      signal: undefined,
    }, {
      context: {},
    })

    expect(response?.status).toBe(500)
  })
})
