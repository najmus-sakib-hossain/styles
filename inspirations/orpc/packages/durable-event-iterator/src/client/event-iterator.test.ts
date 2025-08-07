import type { DurableEventIteratorTokenPayload } from '../schemas'
import { AsyncIteratorClass, isAsyncIteratorObject } from '@orpc/shared'
import { SignJWT } from 'jose'
import { createClientDurableEventIterator } from './event-iterator'

describe('createClientDurableEventIterator', async () => {
  const signingKey = new TextEncoder().encode('some-secret-key')

  const tokenPayload: Omit<DurableEventIteratorTokenPayload, 'iat' | 'exp'> = {
    chn: 'some-channel',
    rpc: ['method1', 'method2'],
    att: { some: 'claims' },
  }

  const token = await new SignJWT(tokenPayload)
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime(new Date(Date.now() + 60 * 60 * 24 * 1000))
    .sign(signingKey)

  const next = vi.fn(() => Promise.resolve({ value: '__next__', done: false }))
  const cleanup = vi.fn(() => Promise.resolve())
  const call = vi.fn(() => Promise.resolve('__call__'))

  const iterator = createClientDurableEventIterator(new AsyncIteratorClass<any>(next, cleanup), {
    call,
  }, {
    token,
  })

  it('a async iterator', async () => {
    expect(iterator).toSatisfy(isAsyncIteratorObject)

    expect(await iterator.next()).toEqual({ value: '__next__', done: false })
    expect(next).toHaveBeenCalledTimes(1)

    expect(await iterator.return()).toEqual({ value: undefined, done: true })
    expect(cleanup).toHaveBeenCalledTimes(1)
  })

  it('has methods from the token', async () => {
    expect(iterator.method1).toBeInstanceOf(Function)
    expect(iterator.method2).toBeInstanceOf(Function)
    expect(iterator.random).not.toBeDefined()

    await expect((iterator as any).method1('value1', { context: { context1: true } })).resolves.toEqual('__call__')
    await expect((iterator as any).method2.nested.ping('value2')).resolves.toEqual('__call__')

    expect(call).toHaveBeenCalledTimes(2)
    expect(call).toHaveBeenNthCalledWith(1, ['method1'], 'value1', { context: { context1: true } })
    expect(call).toHaveBeenNthCalledWith(2, ['method2', 'nested', 'ping'], 'value2', { context: {} })
  })
})
