import type { ORPCError } from '@orpc/contract'
import { safe } from '@orpc/client'
import { ping, pong } from '../tests/shared'
import { call } from './procedure-utils'

it('call', async () => {
  const [error, data, isDefined] = await safe(call(ping, { input: 123 }, { context: { db: 'postgres' } }))

  if (!error) {
    expectTypeOf(data).toEqualTypeOf<{ output: string }>()
  }

  if (isDefined) {
    expectTypeOf(error).toEqualTypeOf<ORPCError<'BASE', { output: string }> | ORPCError<'OVERRIDE', unknown>>()
  }

  // support signal and lastEventId
  call(ping, { input: 123 }, { context: { db: 'postgres' }, signal: AbortSignal.timeout(1000) })
  call(ping, { input: 123 }, { context: { db: 'postgres' }, lastEventId: '123' })

  // can call without context if all field is optional
  call(pong, undefined)
  call(pong, undefined, { context: {}, signal: AbortSignal.timeout(1000), lastEventId: '123' })

  // @ts-expect-error - invalid input
  call(ping, { input: '123' }, { context: { db: 'postgres' } })

  // can call without third argument if all context fields is optional
  call(pong, { input: 123 })
  // @ts-expect-error - context is required
  call(ping, { input: 123 })
  // @ts-expect-error - invalid context
  call(ping, { input: 123 }, { context: { db: 123 } })
  // @ts-expect-error - invalid signal
  call(ping, { input: 123 }, { context: { db: 'postgres' }, signal: 'invalid' })
  // @ts-expect-error - invalid lastEventId
  call(ping, { input: 123 }, { context: { db: 'postgres' }, lastEventId: 123 })
})
