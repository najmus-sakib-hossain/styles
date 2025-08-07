import { createORPCClient } from '@orpc/client'
import { os } from '@orpc/server'
import { StandardOpenAPIHandler } from '../../../../openapi/src/adapters/standard/openapi-handler'
import { StandardOpenAPILink } from './openapi-link'

describe('standardOpenAPILink', () => {
  const date = new Date()
  const blob = new Blob(['hello'], { type: 'text/plain' })

  const router = {
    GET: os.route({ method: 'GET', path: '/ping/{pong}' }).handler(({ input }) => input),
    POST: os.handler(({ input }) => input),
  }

  const handler = new StandardOpenAPIHandler(router, {})

  const link = new StandardOpenAPILink(router, {
    async call(request, options, path, input) {
      const { response } = await handler.handle({ ...request, body: () => Promise.resolve(request.body) }, {
        context: {},
        prefix: '/api',
      })

      if (!response) {
        throw new Error('No response')
      }

      return { ...response, body: () => Promise.resolve(response.body) }
    },
  }, {
    url: 'http://localhost:3000/api',
  })

  const client = createORPCClient(link) as any

  it('method: GET', async () => {
    expect(await client.GET({
      pong: 'pong',
      a: 1,
      b: 2,
      nested: {
        date,
        arr: [3, date],
      },
    })).toEqual({
      pong: 'pong',
      a: '1',
      b: '2',
      nested: {
        date: date.toISOString(),
        arr: ['3', date.toISOString()],
      },
    })
  })

  it('method: POST', async () => {
    expect(await client.POST({
      a: 1,
      b: 2,
      nested: {
        date,
        arr: [3, date],
      },
    })).toEqual({
      a: 1,
      b: 2,
      nested: {
        date: date.toISOString(),
        arr: [3, date.toISOString()],
      },
    })
  })

  it('method: POST with blob', async () => {
    expect(await client.POST({
      a: 1,
      b: 2,
      nested: {
        date,
        arr: [3, date],
      },
      blob,
    })).toEqual({
      a: '1',
      b: '2',
      nested: {
        date: date.toISOString(),
        arr: ['3', date.toISOString()],
      },
      blob: expect.any(File),
    })
  })

  it('method: POST with blob in root', async () => {
    expect(await client.POST({
      blob,
    })).toEqual({
      blob: expect.any(File),
    })
  })
})
