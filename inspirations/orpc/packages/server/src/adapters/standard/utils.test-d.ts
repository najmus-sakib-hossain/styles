import type { FriendlyStandardHandleOptions } from './utils'

it('FriendlyStandardHandleOptions', () => {
  const _1: FriendlyStandardHandleOptions<{ a: string }> = { context: { a: '1' } }
  // @ts-expect-error - context is required
  const _2: FriendlyStandardHandleOptions<{ a: string }> = { }
  const _3: FriendlyStandardHandleOptions<{ a?: string }> = { context: { a: '1' } }
  const _4: FriendlyStandardHandleOptions<{ a?: string }> = { }
  // @ts-expect-error - context is invalid
  const _5: FriendlyStandardHandleOptions<{ a?: string }> = { context: { a: 1 } }
})
