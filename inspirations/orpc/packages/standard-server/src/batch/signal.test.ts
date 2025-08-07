import { toBatchAbortSignal } from './signal'

describe('toBatchAbortSignal', () => {
  it('should return undefined if contains undefined or empty array', () => {
    expect(toBatchAbortSignal([])).toBe(undefined)
    expect(toBatchAbortSignal([undefined])).toBe(undefined)
    expect(toBatchAbortSignal([AbortSignal.timeout(100), undefined])).toBe(undefined)
    expect(toBatchAbortSignal([AbortSignal.timeout(100), undefined, AbortSignal.timeout(100)])).toBe(undefined)
  })

  it('should return a non-aborted signal initially if not all inputs are aborted', () => {
    const controller1 = new AbortController()
    const controller2 = new AbortController()

    expect(toBatchAbortSignal([controller1.signal, controller2.signal])?.aborted).toBe(false)

    controller1.abort()
    expect(toBatchAbortSignal([controller1.signal, controller2.signal])?.aborted).toBe(false)
  })

  it('should return an aborted signal initially if all valid inputs are already aborted', () => {
    const controller1 = new AbortController()
    const controller2 = new AbortController()
    controller1.abort()
    controller2.abort()

    const batchSignal = toBatchAbortSignal([controller1.signal, controller2.signal])
    expect(batchSignal?.aborted).toBe(true)
  })

  it('should fire abort event when all signals abort', () => {
    const controllerPreAborted = new AbortController()
    const controllerLater1 = new AbortController()
    const controllerLater2 = new AbortController()

    controllerPreAborted.abort()

    const batchSignal = toBatchAbortSignal([
      controllerPreAborted.signal,
      controllerLater1.signal,
      controllerLater2.signal,
    ])

    expect(batchSignal?.aborted).toBe(false)

    const abortSpy = vi.fn()
    batchSignal?.addEventListener('abort', abortSpy)

    controllerLater1.abort()
    expect(batchSignal?.aborted).toBe(false)
    expect(abortSpy).not.toHaveBeenCalled()

    controllerLater2.abort()
    expect(batchSignal?.aborted).toBe(true)
    expect(abortSpy).toHaveBeenCalledTimes(1)
  })
})
