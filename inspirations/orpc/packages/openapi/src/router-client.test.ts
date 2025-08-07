import { ORPCError, os } from '@orpc/server'
import { createJsonifiedRouterClient } from './router-client'

describe('createJsonifiedRouterClient', () => {
  const date = new Date()
  const file = new File(['foo'], 'some-name.pdf', { type: 'application/pdf' })

  const router = os.router({
    date: os.handler(({ input }) => ({ date, nested: { date }, input })),
    file: os.handler(({ input }) => ({ file, nested: { file }, input })),
    error: os.handler(() => {
      throw new Error('error')
    }),
    orpc_error: os.handler(() => {
      throw new ORPCError('BAD_REQUEST', {
        message: 'orpc error',
        data: { date, nested: { file } },
      })
    }),
  })

  it('on success', async () => {
    const client = createJsonifiedRouterClient(router)

    await expect(client.date('now')).resolves.toEqual({ date: date.toISOString(), nested: { date: date.toISOString() }, input: 'now' })

    const { file, nested, input } = await client.file('file')

    expect(file).toBeInstanceOf(File)
    expect(file.name).toBe('some-name.pdf')
    expect(file.type).toBe('application/pdf')
    expect(await file.text()).toBe('foo')

    expect(nested).toEqual({ file })
    expect(input).toBe('file')
  })

  it('on error', async () => {
    const client = createJsonifiedRouterClient(router)

    await expect(client.error()).rejects.toSatisfy((e) => {
      expect(e).toBeInstanceOf(Error)
      expect(e.message).toBe('error')
      expect(e.cause).toBeUndefined()

      return true
    })

    await expect(client.orpc_error()).rejects.toSatisfy((e) => {
      expect(e).toBeInstanceOf(ORPCError)
      expect(e.code).toBe('BAD_REQUEST')
      expect(e.status).toBe(400)
      expect(e.message).toBe('orpc error')
      expect(e.data).toEqual({ date: date.toISOString(), nested: { file } })

      return true
    })
  })
})
