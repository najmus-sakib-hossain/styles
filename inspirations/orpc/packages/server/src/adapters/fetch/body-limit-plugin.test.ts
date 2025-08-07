import { os } from '../../builder'
import { BodyLimitPlugin } from './body-limit-plugin'
import { RPCHandler } from './rpc-handler'

describe('bodyLimitPlugin', () => {
  const size22Json = { json: { foo: 'bar' } }

  it('should ignore for non-body request', async () => {
    const handler = new RPCHandler(os.handler(() => 'ping'), {
      strictGetMethodPluginEnabled: false,
      plugins: [
        new BodyLimitPlugin({ maxBodySize: 22 }),
      ],
    })

    const { response } = await handler.handle(new Request('https://example.com/?data=%7B%7D'))

    await expect(response?.text()).resolves.toContain('ping')
    expect(response?.status).toBe(200)
  })

  it('should work if body size is not exceeded', async () => {
    const handler = new RPCHandler(os.handler(() => 'ping'), {
      plugins: [
        new BodyLimitPlugin({ maxBodySize: 22 }),
      ],
    })

    const { response } = await handler.handle(new Request('https://example.com/', {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
      },
      body: JSON.stringify(size22Json),
    }))

    await expect(response?.text()).resolves.toContain('ping')
    expect(response?.status).toBe(200)
  })

  it('check the content-length', async () => {
    const handler = new RPCHandler(os.handler(() => 'ping'), {
      plugins: [
        new BodyLimitPlugin({ maxBodySize: 21 }),
      ],
    })
    const { response } = await handler.handle(new Request('https://example.com', {
      method: 'POST',
      headers: {
        'content-length': '22',
      },
      body: JSON.stringify({}),
    }))

    await expect(response?.text()).resolves.toContain('PAYLOAD_TOO_LARGE')
    expect(response?.status).toBe(413)
  })

  it('check the body-size', async () => {
    const handler = new RPCHandler(os.handler(() => 'ping'), {
      plugins: [
        new BodyLimitPlugin({ maxBodySize: 21 }),
      ],
    })

    const { response } = await handler.handle(new Request('https://example.com/', {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
      },
      body: JSON.stringify(size22Json),
    }))

    await expect(response?.text()).resolves.toContain('PAYLOAD_TOO_LARGE')
    expect(response?.status).toBe(413)
  })
})
