import { os } from '@orpc/server'
import { StandardOpenAPIHandler } from './openapi-handler'

describe('standardOpenAPIHandler', () => {
  const handler = new StandardOpenAPIHandler(os.route({ method: 'GET', path: '/ping' }).handler(({ input }) => ({ output: input })), {

  })

  it('works', async () => {
    const { response } = await handler.handle({
      url: new URL('https://example.com/api/v1/ping?input=hello'),
      body: () => Promise.resolve(undefined),
      headers: {},
      method: 'GET',
      signal: undefined,
    }, {
      prefix: '/api/v1',
      context: {},
    })

    expect(response!.body).toEqual({ output: { input: 'hello' } })
  })
})
