import { baseErrorMap } from '../../contract/tests/shared'
import { decorateMiddleware } from './middleware-decorated'

beforeEach(() => {
  vi.clearAllMocks()
})

describe('decorateMiddleware', () => {
  it('just a copied function', () => {
    const fn = vi.fn()
    const decorated = decorateMiddleware(fn) as any

    fn.mockReturnValueOnce('__mocked__')

    expect(decorated).not.toBe(fn)
    expect(decorated('input')).toBe('__mocked__')
    expect(fn).toHaveBeenCalledTimes(1)
    expect(fn).toHaveBeenCalledWith('input')
  })

  it('.mapInput', () => {
    const fn = Object.assign(vi.fn(), { '~orpcErrorMap': baseErrorMap })
    const map = vi.fn()
    const decorated = decorateMiddleware(fn).mapInput(map) as any

    fn.mockReturnValueOnce('__mocked__')
    map.mockReturnValueOnce('__input__')

    expect(decorated({}, 'something')).toBe('__mocked__')

    expect(map).toHaveBeenCalledTimes(1)
    expect(map).toHaveBeenCalledWith('something')

    expect(fn).toHaveBeenCalledTimes(1)
    expect(fn).toHaveBeenCalledWith({}, '__input__')
  })

  describe('.concat', () => {
    const fn = vi.fn()
    const fn2 = vi.fn()
    const next = vi.fn()

    const mid1 = vi.fn((options, input, output) => {
      fn(options, input, output)
      return options.next({ context: { auth: 1, mid1: true } })
    })

    const mid2 = vi.fn((options, input, output) => {
      fn2(options, input, output)
      return options.next({ context: { auth: 2, mid2: true } })
    })

    it('without map input', async () => {
      const decorated = decorateMiddleware(mid1).concat(mid2) as any

      next.mockReturnValueOnce('__mocked__')
      const outputFn = vi.fn()
      const signal = AbortSignal.timeout(100)
      expect((await decorated({ next, context: { origin: true }, signal }, 'input', outputFn))).toBe('__mocked__')

      expect(fn).toHaveBeenCalledTimes(1)
      expect(fn).toHaveBeenCalledWith({ next: expect.any(Function), context: { origin: true }, signal }, 'input', outputFn)

      expect(fn2).toHaveBeenCalledTimes(1)
      expect(fn2).toHaveBeenCalledWith({ next: expect.any(Function), context: { origin: true, auth: 1, mid1: true }, signal }, 'input', outputFn)

      expect(next).toHaveBeenCalledTimes(1)
      expect(next).toHaveBeenCalledWith({ context: { auth: 2, mid2: true, mid1: true } })
    })

    it('with map input', async () => {
      const map = vi.fn()

      const decorated = decorateMiddleware(mid1).concat(mid2, map) as any

      map.mockReturnValueOnce({ name: 'input' })
      next.mockReturnValueOnce('__mocked__')

      const outputFn = vi.fn()
      expect((await decorated({ next }, 'input', outputFn))).toBe('__mocked__')

      expect(fn).toHaveBeenCalledTimes(1)
      expect(fn).toHaveBeenCalledWith({ next: expect.any(Function) }, 'input', outputFn)

      expect(map).toHaveBeenCalledTimes(1)
      expect(map).toHaveBeenCalledWith('input')

      expect(fn2).toHaveBeenCalledTimes(1)
      expect(fn2).toHaveBeenCalledWith({ context: { auth: 1, mid1: true }, next: expect.any(Function) }, { name: 'input' }, outputFn)

      expect(next).toHaveBeenCalledTimes(1)
      expect(next).toHaveBeenCalledWith({ context: { auth: 2, mid1: true, mid2: true } })
    })
  })
})
