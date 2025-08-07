import { resolveFriendlyStandardHandleOptions } from './utils'

it('resolveFriendlyStandardHandleOptions', () => {
  expect(resolveFriendlyStandardHandleOptions({})).toEqual({ context: {} })
  expect(resolveFriendlyStandardHandleOptions({ context: { a: 1 } })).toEqual({ context: { a: 1 } })
  expect(resolveFriendlyStandardHandleOptions({ prefix: '/api/v1', context: { a: 1 } })).toEqual({ prefix: '/api/v1', context: { a: 1 } })
})
