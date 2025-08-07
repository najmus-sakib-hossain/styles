import { describe } from 'vitest'
import { os } from '../../builder'
import { StandardRPCHandler } from './rpc-handler'

describe('standardRPCHandler', () => {
  const handler = new StandardRPCHandler({
    ping: os.handler(({ input }) => ({ output: input })),
  }, {})

  it('works', async () => {
    const { response } = await handler.handle({
      url: new URL('https://example.com/api/v1/ping'),
      body: () => Promise.resolve({
        json: 'value',
      }),
      headers: {},
      method: 'POST',
      signal: undefined,
    }, {
      prefix: '/api/v1',
      context: {},
    })

    expect(response?.body).toEqual({ json: { output: 'value' } })
  })
})
