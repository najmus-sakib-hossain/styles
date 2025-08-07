import { type } from './schema'

describe('type', async () => {
  it('without map', async () => {
    const schema = type()
    const val = {}
    expect((await schema['~standard'].validate(val) as any).value).toBe(val)
  })

  it('with map', async () => {
    const val = {}
    const check = vi.fn().mockReturnValueOnce('__mapped__')
    const schema = type(check)
    expect((await schema['~standard'].validate(val) as any).value).toBe('__mapped__')
    expect(check).toHaveBeenCalledWith(val)
  })
})
