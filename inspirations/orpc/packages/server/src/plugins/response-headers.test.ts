import type { ResponseHeadersPluginContext } from './response-headers'
import { OpenAPIHandler } from '../../../openapi/src/adapters/fetch/openapi-handler'
import { os } from '../builder'
import { ResponseHeadersPlugin } from './response-headers'

describe('responseHeadersPlugin', () => {
  it('works', async () => {
    const router = os
      .$context<ResponseHeadersPluginContext>()
      .use(({ context, next }) => {
        context.resHeaders?.set('x-custom-1', 'mid')
        context.resHeaders?.set('x-custom-2', 'mid')
        context.resHeaders?.set('x-custom-3', 'mid')
        context.resHeaders?.set('x-custom-4', 'mid')

        return next()
      })
      .route({
        method: 'GET',
        path: '/ping',
        outputStructure: 'detailed',
      })
      .handler(() => {
        return {
          headers: {
            'x-custom-1': 'value',
            'x-custom-2': ['1', '2'],
            'x-custom-3': undefined,
          },
        }
      })

    const handler = new OpenAPIHandler(router, {
      plugins: [
        new ResponseHeadersPlugin(),
      ],
    })

    const { response } = await handler.handle(new Request('https://example.com/ping'))

    if (!response) {
      throw new Error('response is undefined')
    }

    expect(response.headers.get('x-custom-1')).toBe('value, mid')
    expect(response.headers.get('x-custom-2')).toBe('1, 2, mid')
    expect(response.headers.get('x-custom-3')).toBe('mid')
    expect(response.headers.get('x-custom-4')).toBe('mid')

    await handler.handle(new Request('https://example.com/not_found'))
  })

  it('should clone the context to avoid reference issues', async () => {
    const router = os
      .$context<ResponseHeadersPluginContext>()
      .route({
        method: 'GET',
        path: '/ping',
      })
      .handler(() => 'ping')

    const interceptor = vi.fn(({ next }) => next())

    const handler = new OpenAPIHandler(router, {
      plugins: [
        new ResponseHeadersPlugin(),
      ],
      interceptors: [
        interceptor,
      ],
    })

    const context = { a: 'value' }
    await handler.handle(new Request('https://example.com/ping'), { context })

    expect(interceptor).toHaveBeenCalledOnce()
    expect(interceptor).toHaveBeenCalledWith(expect.objectContaining({
      context: { ...context, resHeaders: expect.any(Headers) },
    }))

    expect(interceptor.mock.calls[0]![0].context).not.toBe(context)
  })

  it('should use the provided resHeaders when already defined', async () => {
    const router = os
      .$context<ResponseHeadersPluginContext>()
      .route({
        method: 'GET',
        path: '/ping',
      })
      .handler(() => 'ping')

    const interceptor = vi.fn(({ next }) => next())

    const handler = new OpenAPIHandler(router, {
      plugins: [
        new ResponseHeadersPlugin(),
      ],
      interceptors: [
        interceptor,
      ],
    })

    const context = { a: 'value', resHeaders: new Headers() }
    await handler.handle(new Request('https://example.com/ping'), { context })

    expect(interceptor).toHaveBeenCalledOnce()
    expect(interceptor).toHaveBeenCalledWith(expect.objectContaining({
      context,
    }))

    expect(interceptor.mock.calls[0]![0].context.resHeaders).toBe(context.resHeaders)
  })
})
