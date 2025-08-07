import { os } from '@orpc/server'
import { OpenAPIHandler } from './openapi-handler'

describe('openAPIHandler', () => {
  it('works', async () => {
    const handler = new OpenAPIHandler(os.route({ method: 'GET', path: '/ping' }).handler(({ input }) => ({ output: input })))

    const { response } = await handler.handle(new Request('https://example.com/api/v1/ping?input=hello'), {
      prefix: '/api/v1',
    })

    await expect(response?.text()).resolves.toContain('hello')
    expect(response?.status).toBe(200)
  })
})
