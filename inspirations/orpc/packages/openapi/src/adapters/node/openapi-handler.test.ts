import type { IncomingMessage, ServerResponse } from 'node:http'
import { os } from '@orpc/server'
import request from 'supertest'
import { OpenAPIHandler } from './openapi-handler'

describe('openAPIHandler', () => {
  it('works', async () => {
    const handler = new OpenAPIHandler(os.route({ method: 'GET', path: '/ping' }).handler(({ input }) => ({ output: input })))

    const res = await request(async (req: IncomingMessage, res: ServerResponse) => {
      await handler.handle(req, res, { prefix: '/prefix' })
    }).get('/prefix/ping?input=hello')

    expect(res.text).toContain('hello')
    expect(res.status).toBe(200)
  })
})
