import { getCustomZodDef } from './base'
import { regexp } from './regexp'

it('regexp', () => {
  expect(regexp().parse(/d/)).toBeInstanceOf(RegExp)
  expect(() => regexp().parse({})).toThrow('Input is not a regexp')
  expect(() => regexp(() => ({ message: '__INVALID__' })).parse({})).toThrow('__INVALID__')

  expect(getCustomZodDef(regexp()._def)).toEqual({ type: 'regexp' })
})
