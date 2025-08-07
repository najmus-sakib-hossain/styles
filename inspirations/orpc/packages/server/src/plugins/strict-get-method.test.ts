import { RPCHandler } from '../adapters/fetch'
import { os } from '../builder'
import { StrictGetMethodPlugin } from './strict-get-method'

describe('strictGetMethodPlugin', () => {
  const interceptor = vi.fn(({ next }) => next())

  const handler = new RPCHandler({
    ping: os.handler(() => 'pong'),
    pong: os.route({ method: 'GET' }).handler(() => 'pong'),
  }, {
    plugins: [
      new StrictGetMethodPlugin(),
    ],
    rootInterceptors: [interceptor],
  })

  it('not allow use GET method for procedure not explicitly marked as GET', async () => {
    await expect(
      handler.handle(new Request('http://localhost/ping?data=%7B%7D')),
    ).resolves.toEqual({ matched: true, response: expect.toSatisfy(response => response.status === 405) })

    await expect(
      handler.handle(new Request('http://localhost/ping', {
        method: 'POST',
        body: JSON.stringify({ }),
        headers: {
          'Content-Type': 'application/json',
        },
      })),
    ).resolves.toEqual({ matched: true, response: expect.toSatisfy(response => response.status === 200) })
  })

  it('allow use GET method for procedure explicitly marked as GET', async () => {
    await expect(
      handler.handle(new Request('http://localhost/pong?data=%7B%7D')),
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
      handler.handle(new Request('http://localhost/ping', {
        method: 'POST',
        body: JSON.stringify({}),
        headers: {
          'Content-Type': 'application/json',
        },
      })),
    ).resolves.toEqual({ matched: true, response: expect.toSatisfy(response => response.status === 500) })
  })
})
