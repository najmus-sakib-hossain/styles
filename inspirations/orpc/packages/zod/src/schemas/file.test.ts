import { getCustomZodDef } from './base'
import { file } from './file'

describe('file', () => {
  it('works', () => {
    expect(file().parse(new File([], ''))).toBeInstanceOf(File)
    expect(() => file().parse({})).toThrow('Input is not a file')
    expect(() => file({ message: '__INVALID__' }).parse({})).toThrow('__INVALID__')

    expect(getCustomZodDef(file()._def)).toEqual({ type: 'file' })
  })

  it('mine type', () => {
    const schema = file().type('image/*')
    expect(schema.parse(new File([], 'images.png', { type: 'image/png' }))).toBeInstanceOf(File)

    expect(() => schema.parse({})).toThrow('Input is not a file')
    expect(
      () => schema.parse(new File([], 'file.pdf', { type: 'application/pdf' })),
    ).toThrow('Expected a file of type image/* but got a file of type application/pdf')

    expect(
      () => schema.parse(new File([], 'file.pdf')),
    ).toThrow('Expected a file of type image/* but got a file of type unknown')

    expect(
      () => file().type('image/*', '__INVALID__').parse(new File([], 'file.pdf', { type: 'application/pdf' })),
    ).toThrow('__INVALID__')

    expect(getCustomZodDef(schema._def)).toEqual({ type: 'file', mimeType: 'image/*' })
  })
})
