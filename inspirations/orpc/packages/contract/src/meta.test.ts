import { mergeMeta } from './meta'

it('mergeMeta', () => {
  expect(mergeMeta({}, { a: 2 })).toEqual({ a: 2 })
  expect(mergeMeta({ a: 1, b: 1 }, { a: 2 })).toEqual({ a: 2, b: 1 })
})
