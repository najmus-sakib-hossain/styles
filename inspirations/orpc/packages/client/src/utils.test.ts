import { ORPCError } from './error'
import { resolveFriendlyClientOptions, safe } from './utils'

it('safe', async () => {
  const r1 = await safe(Promise.resolve(1))
  expect([...r1]).toEqual([null, 1, false, true])
  expect({ ...r1 }).toEqual(expect.objectContaining({ error: null, data: 1, isDefined: false, isSuccess: true }))

  const e2 = new Error('error')
  const r2 = await safe(Promise.reject(e2))
  expect([...r2]).toEqual([e2, undefined, false, false])
  expect({ ...r2 }).toEqual(expect.objectContaining({ error: e2, data: undefined, isDefined: false, isSuccess: false }))

  const e3 = new ORPCError('BAD_GATEWAY', { defined: true })
  const r3 = await safe(Promise.reject(e3))
  expect([...r3]).toEqual([e3, undefined, true, false])
  expect({ ...r3 }).toEqual(expect.objectContaining({ error: e3, data: undefined, isDefined: true, isSuccess: false }))

  const e4 = new ORPCError('BAD_GATEWAY')
  const r4 = await safe(Promise.reject(e4))
  expect([...r4]).toEqual([e4, undefined, false, false])
  expect({ ...r4 }).toEqual(expect.objectContaining({ error: e4, data: undefined, isDefined: false, isSuccess: false }))
})

it('resolveFriendlyClientOptions', () => {
  expect(resolveFriendlyClientOptions({})).toEqual({ context: {} })
  expect(resolveFriendlyClientOptions({ context: { a: 1 } })).toEqual({ context: { a: 1 } })
  expect(resolveFriendlyClientOptions({ lastEventId: '123' })).toEqual({ context: {}, lastEventId: '123' })
})
