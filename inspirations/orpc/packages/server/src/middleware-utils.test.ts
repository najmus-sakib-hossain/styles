import { addMiddleware, isStartWithMiddlewares, mergeMiddlewares } from './middleware-utils'

const mid1 = vi.fn()
const mid2 = vi.fn()
const mid3 = vi.fn()

it('isStartWithMiddlewares', () => {
  expect(isStartWithMiddlewares([mid1, mid2], [mid1, mid2])).toEqual(true)
  expect(isStartWithMiddlewares([mid1, mid2, mid3], [mid1, mid2, mid3])).toEqual(true)

  expect(isStartWithMiddlewares([mid1, mid2], [mid1, mid2, mid3])).toEqual(false)
  expect(isStartWithMiddlewares([mid1, mid2], [mid1])).toEqual(true)
  expect(isStartWithMiddlewares([mid2, mid1], [mid1])).toEqual(false)
  expect(isStartWithMiddlewares([mid1, mid2], [mid1, mid3])).toEqual(false)
  expect(isStartWithMiddlewares([mid1, mid3], [mid3])).toEqual(false)

  expect(isStartWithMiddlewares([mid1, mid2, mid3], [mid1, mid2])).toEqual(true)
  expect(isStartWithMiddlewares([mid1, mid2, mid3], [mid1])).toEqual(true)
})

describe('mergeMiddlewares', () => {
  it('dedupeLeading=false', () => {
    expect(mergeMiddlewares([mid1, mid2], [], { dedupeLeading: false })).toEqual([mid1, mid2])
    expect(mergeMiddlewares([], [mid1, mid2], { dedupeLeading: false })).toEqual([mid1, mid2])
    expect(mergeMiddlewares([mid1], [mid2], { dedupeLeading: false })).toEqual([mid1, mid2])
    expect(mergeMiddlewares([mid1], [mid1, mid2], { dedupeLeading: false })).toEqual([mid1, mid1, mid2])
    expect(mergeMiddlewares([mid1, mid3], [mid1, mid2], { dedupeLeading: false })).toEqual([mid1, mid3, mid1, mid2])
  })

  it('dedupeLeading=true', () => {
    expect(mergeMiddlewares([mid1, mid2], [], { dedupeLeading: true })).toEqual([mid1, mid2])
    expect(mergeMiddlewares([], [mid1, mid2], { dedupeLeading: true })).toEqual([mid1, mid2])
    expect(mergeMiddlewares([mid1], [mid2], { dedupeLeading: true })).toEqual([mid1, mid2])
    expect(mergeMiddlewares([mid1], [mid1, mid2], { dedupeLeading: true })).toEqual([mid1, mid2])
    expect(mergeMiddlewares([mid1], [mid1, mid3], { dedupeLeading: true })).toEqual([mid1, mid3])
    expect(mergeMiddlewares([mid1, mid1, mid3], [mid1, mid1, mid3, mid1], { dedupeLeading: true })).toEqual([mid1, mid1, mid3, mid1])

    expect(mergeMiddlewares([mid1], [mid3, mid1], { dedupeLeading: true })).toEqual([mid1, mid3, mid1])
    expect(mergeMiddlewares([mid1, mid3], [mid1], { dedupeLeading: true })).toEqual([mid1, mid3, mid1])
    expect(mergeMiddlewares([mid1, mid2], [mid3], { dedupeLeading: true })).toEqual([mid1, mid2, mid3])
  })
})

it('addMiddleware', () => {
  expect(addMiddleware([], mid1)).toEqual([mid1])
  expect(addMiddleware([mid1], mid2)).toEqual([mid1, mid2])
  expect(addMiddleware([mid1], mid2)).toEqual([mid1, mid2])
})
