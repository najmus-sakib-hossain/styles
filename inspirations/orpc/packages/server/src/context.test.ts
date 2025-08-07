import { mergeCurrentContext } from './context'

it('mergeCurrentContext', () => {
  expect(mergeCurrentContext({ a: 1 }, { b: 2 })).toEqual({ a: 1, b: 2 })
  expect(mergeCurrentContext({ a: 1 }, { a: 2 })).toEqual({ a: 2 })
})
