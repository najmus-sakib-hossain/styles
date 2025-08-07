import { getCustomZodDef } from './base'
import { url } from './url'

it('url', () => {
  expect(url().parse(new URL('https://example.com'))).toBeInstanceOf(URL)
  expect(() => url().parse({})).toThrow('Input is not a URL')
  expect(() => url('__INVALID__').parse({})).toThrow('__INVALID__')

  expect(getCustomZodDef(url()._def)).toEqual({ type: 'url' })
})
