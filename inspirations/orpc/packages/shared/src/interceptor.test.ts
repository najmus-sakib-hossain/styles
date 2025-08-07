import { intercept, onError, onFinish, onStart, onSuccess } from './interceptor'

beforeEach(() => {
  vi.clearAllMocks()
})

describe('intercept', () => {
  const interceptor1 = vi.fn(({ next }) => next())
  const interceptor2 = vi.fn(({ next }) => next())
  const main = vi.fn(() => Promise.resolve('__main__'))

  it('sync', async () => {
    const main = vi.fn(() => '__main__')
    interceptor2.mockReturnValueOnce('__interceptor2__')

    const result = await intercept(
      [
        interceptor1,
        interceptor2,
      ],
      {
        foo: 'bar',
      },
      main,
    )

    expect(result).toEqual('__interceptor2__')
    expect(interceptor1).toHaveBeenCalledTimes(1)
    expect(interceptor1).toHaveBeenCalledWith({
      foo: 'bar',
      next: expect.any(Function),
    })

    expect(interceptor2).toHaveBeenCalledTimes(1)
    expect(interceptor2).toHaveBeenCalledWith({
      foo: 'bar',
      next: expect.any(Function),
    })

    expect(main).toHaveBeenCalledTimes(0)

    expect(interceptor2.mock.calls[0]![0].next()).toEqual('__main__')
    expect(main).toHaveBeenCalledTimes(1)
    expect(main).toHaveBeenCalledWith({
      foo: 'bar',
    })
  })

  it('async', async () => {
    interceptor2.mockReturnValueOnce(Promise.resolve('__interceptor2__'))

    const result = await intercept(
      [
        interceptor1,
        interceptor2,
      ],
      {
        foo: 'bar',
      },
      main,
    )

    expect(result).toEqual('__interceptor2__')
    expect(interceptor1).toHaveBeenCalledTimes(1)
    expect(interceptor1).toHaveBeenCalledWith({
      foo: 'bar',
      next: expect.any(Function),
    })

    expect(interceptor2).toHaveBeenCalledTimes(1)
    expect(interceptor2).toHaveBeenCalledWith({
      foo: 'bar',
      next: expect.any(Function),
    })

    expect(main).toHaveBeenCalledTimes(0)

    expect(await interceptor2.mock.calls[0]![0].next()).toEqual('__main__')
    expect(main).toHaveBeenCalledTimes(1)
    expect(main).toHaveBeenCalledWith({
      foo: 'bar',
    })
  })

  it('can override options', async () => {
    interceptor1.mockImplementationOnce(({ next }) => next({ bar: 'foo' }))

    const result = await intercept(
      [
        interceptor1,
        interceptor2,
      ],
      {
        foo: 'bar',
      },
      main,
    )

    expect(result).toEqual('__main__')

    expect(interceptor1).toHaveBeenCalledTimes(1)
    expect(interceptor1).toHaveBeenCalledWith({
      foo: 'bar',
      next: expect.any(Function),
    })

    expect(interceptor2).toHaveBeenCalledTimes(1)
    expect(interceptor2).toHaveBeenCalledWith({
      bar: 'foo',
      next: expect.any(Function),
    })

    expect(main).toHaveBeenCalledTimes(1)
    expect(main).toHaveBeenCalledWith({
      bar: 'foo',
    })
  })

  it('ignores conflict in the `next` options', async () => {
    /** Ensure even conflict still can override the `next` options */
    interceptor2.mockImplementationOnce(({ next }) => next({ bar: 'foo', next: 'hello2' }))

    const result = await intercept(
      [
        interceptor1,
        interceptor2,
      ],
      {
        foo: 'bar',
        next: 'hello',
      },
      main,
    )

    expect(result).toEqual('__main__')

    expect(interceptor1).toHaveBeenCalledTimes(1)
    expect(interceptor1).toHaveBeenCalledWith({
      foo: 'bar',
      next: expect.any(Function),
    })

    expect(interceptor2).toHaveBeenCalledTimes(1)
    expect(interceptor2).toHaveBeenCalledWith({
      foo: 'bar',
      next: expect.any(Function),
    })

    expect(main).toHaveBeenCalledTimes(1)
    expect(main).toHaveBeenCalledWith({
      bar: 'foo',
      next: 'hello2',
    })
  })

  it('can multiple .next calls', async () => {
    interceptor2.mockReturnValueOnce(Promise.resolve('__interceptor2__'))

    const result = await intercept(
      [
        async ({ next }) => [await next(), await next(), await next()],
        interceptor1,
        interceptor2,
      ],
      {
        foo: 'bar',
      },
      main,
    )

    expect(result).toEqual(['__interceptor2__', '__main__', '__main__'])

    expect(interceptor1).toHaveBeenCalledTimes(3)
    expect(interceptor1).toHaveBeenCalledWith({
      foo: 'bar',
      next: expect.any(Function),
    })

    expect(interceptor2).toHaveBeenCalledTimes(3)
    expect(interceptor2).toHaveBeenCalledWith({
      foo: 'bar',
      next: expect.any(Function),
    })

    expect(main).toHaveBeenCalledTimes(2)
    expect(main).toHaveBeenCalledWith({
      foo: 'bar',
    })
  })
})

describe('onStart / onSuccess / onError / onFinish', () => {
  const onStartFn = vi.fn()
  const onSuccessFn = vi.fn()
  const onErrorFn = vi.fn()
  const onFinishFn = vi.fn()

  it('on success', async () => {
    const result = await intercept(
      [
        onStart(onStartFn),
        onSuccess(onSuccessFn),
        onError(onErrorFn),
        onFinish(onFinishFn),
      ],
      {
        foo: 'bar',
      },
      () => Promise.resolve('__main__'),
    )

    expect(result).toEqual('__main__')

    expect(onStartFn).toHaveBeenCalledTimes(1)
    expect(onStartFn).toHaveBeenCalledWith({
      foo: 'bar',
      next: expect.any(Function),
    })

    expect(onSuccessFn).toHaveBeenCalledTimes(1)
    expect(onSuccessFn).toHaveBeenCalledWith(
      '__main__',
      {
        foo: 'bar',
        next: expect.any(Function),
      },
    )

    expect(onFinishFn).toHaveBeenCalledTimes(1)
    expect(onFinishFn).toHaveBeenCalledWith(
      [null, '__main__', true],
      {
        foo: 'bar',
        next: expect.any(Function),
      },
    )

    expect(onErrorFn).toHaveBeenCalledTimes(0)
  })

  it('on error', async () => {
    await expect(intercept(
      [
        onStart(onStartFn),
        onSuccess(onSuccessFn),
        onError(onErrorFn),
        onFinish(onFinishFn),
      ],
      {
        foo: 'bar',
      },
      () => Promise.reject(new Error('__error__')),
    )).rejects.toThrowError('__error__')

    expect(onStartFn).toHaveBeenCalledTimes(1)
    expect(onStartFn).toHaveBeenCalledWith({
      foo: 'bar',
      next: expect.any(Function),
    })

    expect(onErrorFn).toHaveBeenCalledTimes(1)
    expect(onErrorFn).toHaveBeenCalledWith(
      new Error('__error__'),
      {
        foo: 'bar',
        next: expect.any(Function),
      },
    )

    expect(onFinishFn).toHaveBeenCalledTimes(1)
    expect(onFinishFn).toHaveBeenCalledWith(
      [new Error('__error__'), undefined, false],
      {
        foo: 'bar',
        next: expect.any(Function),
      },
    )

    expect(onSuccessFn).toHaveBeenCalledTimes(0)
  })
})
