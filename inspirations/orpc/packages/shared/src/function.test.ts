import { defer, once, sequential } from './function'

it('once', () => {
  const fn = vi.fn(() => ({}))
  const onceFn = once(fn)

  expect(onceFn()).toBe(fn.mock.results[0]!.value)
  expect(onceFn()).toBe(fn.mock.results[0]!.value)
  expect(onceFn()).toBe(fn.mock.results[0]!.value)
  expect(onceFn()).toBe(fn.mock.results[0]!.value)
  expect(onceFn()).toBe(fn.mock.results[0]!.value)

  expect(fn).toHaveBeenCalledTimes(1)
})

describe('sequential', () => {
  it('should call the function sequentially', async () => {
    let time = 0
    const fn = vi.fn(async () => {
      const result = time++
      await new Promise(resolve => setTimeout(resolve, 10))
      return result
    })

    const sequentialFn = sequential(fn)

    expect(sequentialFn()).resolves.toBe(0)
    expect(sequentialFn()).resolves.toBe(1)
    expect(sequentialFn()).resolves.toBe(2)
    expect(sequentialFn()).resolves.toBe(3)
  })

  it('should call the function sequentially even with errors', async () => {
    let time = 0
    const fn = vi.fn(async () => {
      const result = time++

      if (result === 1) {
        throw new Error('Forced error')
      }

      await new Promise(resolve => setTimeout(resolve, 10))
      return result
    })

    const sequentialFn = sequential(fn)

    expect(sequentialFn()).resolves.toBe(0)
    expect(sequentialFn()).rejects.toThrow('Forced error')
    expect(sequentialFn()).resolves.toBe(2)
    expect(sequentialFn()).resolves.toBe(3)
  })
})

describe('defer', () => {
  it('with setTimeout', async () => {
    const callback1 = vi.fn()
    const callback2 = vi.fn()

    defer(callback1)
    callback2()

    expect(callback1).toHaveBeenCalledTimes(0)

    await new Promise(resolve => setTimeout(resolve, 100))

    expect(callback1).toHaveBeenCalledTimes(1)
    expect(callback2).toHaveBeenCalledBefore(callback1)
  })

  it('without setTimeout', async () => {
    const callback1 = vi.fn()
    const callback2 = vi.fn()

    const originalSetTimeout = globalThis.setTimeout
    ;(globalThis as any).setTimeout = undefined
    defer(callback1)
    globalThis.setTimeout = originalSetTimeout
    callback2()

    expect(callback1).toHaveBeenCalledTimes(0)

    await new Promise(resolve => setTimeout(resolve, 100))

    expect(callback1).toHaveBeenCalledTimes(1)
    expect(callback2).toHaveBeenCalledBefore(callback1)
  })
})
