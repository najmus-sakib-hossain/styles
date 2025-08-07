import { getCustomZodDef } from './base'
import { blob } from './blob'

it('blob', () => {
  expect(blob().parse(new Blob([]))).toBeInstanceOf(Blob)
  expect(blob().parse(new File([], ''))).toBeInstanceOf(File)
  expect(() => blob().parse({})).toThrow('Input is not a blob')
  expect(() => blob('__INVALID__').parse({})).toThrow('__INVALID__')

  expect(getCustomZodDef(blob()._def)).toEqual({ type: 'blob' })
})
