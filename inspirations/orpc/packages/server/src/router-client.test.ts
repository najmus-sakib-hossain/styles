import { ping, pong, router } from '../tests/shared'
import { unlazy } from './lazy'
import { createProcedureClient } from './procedure-client'
import { createRouterClient } from './router-client'

vi.mock('./procedure-client', () => ({
  createProcedureClient: vi.fn(() => vi.fn(() => '__mocked__')),
}))

beforeEach(() => {
  vi.clearAllMocks()
})

describe('createRouterClient', () => {
  const client = createRouterClient(router, {
    context: { db: 'postgres' },
    path: ['users'],
  })

  it('works', () => {
    expect(client.pong({ val: '123' })).toEqual('__mocked__')

    expect(createProcedureClient).toBeCalledTimes(1)
    expect(createProcedureClient).toBeCalledWith(pong, expect.objectContaining({
      context: { db: 'postgres' },
      path: ['users', 'pong'],
    }))

    expect(vi.mocked(createProcedureClient).mock.results[0]?.value).toBeCalledTimes(1)
    expect(vi.mocked(createProcedureClient).mock.results[0]?.value).toBeCalledWith({ val: '123' })
  })

  it('work with lazy', async () => {
    expect(client.nested.ping({ input: 123 })).toEqual('__mocked__')

    expect(createProcedureClient).toBeCalledTimes(2)
    expect(createProcedureClient).toHaveBeenCalledWith(expect.any(Object), expect.objectContaining({
      context: { db: 'postgres' },
      path: ['users', 'nested', 'ping'],
    }))

    expect((await unlazy(vi.mocked(createProcedureClient as any).mock.calls[1]![0])).default).toBe(ping)

    expect(vi.mocked(createProcedureClient).mock.results[1]?.value).toBeCalledTimes(1)
    expect(vi.mocked(createProcedureClient).mock.results[1]?.value).toBeCalledWith({ input: 123 })
  })

  it('hooks', async () => {
    const interceptor = vi.fn()

    const client = createRouterClient(router, {
      context: { db: 'postgres' },
      interceptors: [interceptor],
    })

    expect(client.pong({ val: '123' })).toEqual('__mocked__')

    expect(createProcedureClient).toBeCalledTimes(1)
    expect(createProcedureClient).toHaveBeenCalledWith(pong, expect.objectContaining({
      context: { db: 'postgres' },
      path: ['pong'],
      interceptors: [interceptor],
    }))
  })

  it('not recursive on symbol', () => {
    expect((client as any)[Symbol('something')]).toBeUndefined()
  })

  it('return undefined if access the undefined key', async () => {
    const client = createRouterClient({
      pong,
    })

    // @ts-expect-error --- invalid access
    expect(client.undefined).toBeUndefined()
  })

  it('works without base path', async () => {
    const client = createRouterClient({
      pong,
    })

    expect(client.pong({ val: '123' })).toEqual('__mocked__')
    expect(vi.mocked(createProcedureClient).mock.calls[0]![1]!.path).toEqual(['pong'])
  })
})
