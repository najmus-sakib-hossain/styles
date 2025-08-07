import { RPCHandler } from '../adapters/fetch'
import { os } from '../builder'
import { SimpleCsrfProtectionHandlerPlugin } from './simple-csrf-protection'

beforeEach(() => {
  vi.clearAllMocks()
})

describe('simpleCsrfProtectionHandlerPlugin', () => {
  const interceptor = vi.fn(({ next }) => next())

  const handler = new RPCHandler({
    ping: os.handler(() => 'pong'),
  }, {
    strictGetMethodPluginEnabled: false,
    plugins: [
      new SimpleCsrfProtectionHandlerPlugin(),
    ],
    rootInterceptors: [interceptor],
  })

  it('should work', async () => {
    await expect(
      handler.handle(new Request('http://localhost/ping?data=%7B%7D')),
    ).resolves.toEqual({ matched: true, response: expect.toSatisfy(response => response.status === 403) })

    await expect(
      handler.handle(new Request('http://localhost/ping?data=%7B%7D', {
        headers: {
          'x-csrf-token': 'orpc',
        },
      })),
    ).resolves.toEqual({ matched: true, response: expect.toSatisfy(response => response.status === 200) })
  })

  it('should throw error when interceptor messes with the context', async () => {
    interceptor.mockImplementation((options) => {
      return options.next({
        ...options,
        context: {}, // <-- interceptor messes with the context
      })
    })

    await expect(
      handler.handle(new Request('http://localhost/ping?data=%7B%7D')),
    ).resolves.toEqual({ matched: true, response: expect.toSatisfy(response => response.status === 500) })

    await expect(
      handler.handle(new Request('http://localhost/ping?data=%7B%7D', {
        headers: {
          'x-csrf-token': 'orpc',
        },
      })),
    ).resolves.toEqual({ matched: true, response: expect.toSatisfy(response => response.status === 500) })
  })

  it('can exclude procedure', async () => {
    const exclude = vi.fn(() => true)

    const ping = os.handler(() => 'pong')

    const handler = new RPCHandler({ ping }, {
      strictGetMethodPluginEnabled: false,
      plugins: [
        new SimpleCsrfProtectionHandlerPlugin({
          exclude,
        }),
      ],
    })

    await expect(
      handler.handle(new Request('http://localhost/ping?data=%7B%7D')),
    ).resolves.toEqual({ matched: true, response: expect.toSatisfy(response => response.status === 200) })

    expect(exclude).toHaveBeenCalledTimes(1)
    expect(exclude).toHaveBeenCalledWith(expect.objectContaining({
      path: ['ping'],
      procedure: ping,
    }))
  })
})
