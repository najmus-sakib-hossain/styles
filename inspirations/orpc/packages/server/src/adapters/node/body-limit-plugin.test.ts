import type { IncomingMessage, ServerResponse } from 'node:http'
import request from 'supertest'
import { os } from '../../builder'
import { BodyLimitPlugin } from './body-limit-plugin'
import { RPCHandler } from './rpc-handler'

describe('bodyLimitPlugin', () => {
  const size22Json = { json: { foo: 'bar' } }

  it('should work if body size is not exceeded', async () => {
    const res = await request(async (req: IncomingMessage, res: ServerResponse) => {
      const handler = new RPCHandler(os.handler(() => 'ping'), {
        plugins: [
          new BodyLimitPlugin({ maxBodySize: 22 }),
        ],
      })

      await handler.handle(req, res)
    })
      .post('/')
      .send(size22Json)

    expect(res.text).toContain('ping')
    expect(res.status).toBe(200)
  })

  it('check the content-length', async () => {
    const res = await request(async (req: IncomingMessage, res: ServerResponse) => {
      const handler = new RPCHandler(os.handler(() => 'ping'), {
        plugins: [
          new BodyLimitPlugin({ maxBodySize: 21 }),
        ],
      })

      await handler.handle(req, res)
    })
      .post('/')
      .send(size22Json)
      .set('content-length', '22')

    expect(res.text).toContain('PAYLOAD_TOO_LARGE')
    expect(res.status).toBe(413)
  })

  it('check the body-size', async () => {
    const res = await request(async (req: IncomingMessage, res: ServerResponse) => {
      const handler = new RPCHandler(os.handler(() => 'ping'), {
        plugins: [
          new BodyLimitPlugin({ maxBodySize: 21 }),
        ],
      })

      delete req.headers['content-length']

      await handler.handle(req, res)
    })
      .post('/')
      .send(size22Json)

    expect(res.text).toContain('PAYLOAD_TOO_LARGE')
    expect(res.status).toBe(413)
  })
})
