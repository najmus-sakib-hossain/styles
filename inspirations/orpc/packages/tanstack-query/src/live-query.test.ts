import { queryClient } from '../tests/shared'
import { experimental_liveQuery as liveQuery } from './live-query'

beforeEach(() => {
  queryClient.clear()
})

describe('liveQuery', async () => {
  it('works', async () => {
    const queryFn = liveQuery(async function* () {
      yield 1
      await new Promise(resolve => setTimeout(resolve, 50))
      yield 2
      await new Promise(resolve => setTimeout(resolve, 50))
      yield 3
    })

    const controller = new AbortController()

    const resultPromise = expect(queryFn({
      queryKey: ['live-query'],
      signal: controller.signal,
      client: queryClient,
    } as any)).resolves.toEqual(3)

    await vi.waitFor(() => {
      expect(queryClient.getQueryData(['live-query'])).toEqual(1)
    })

    await vi.waitFor(() => {
      expect(queryClient.getQueryData(['live-query'])).toEqual(2)
    })

    await resultPromise
  })

  it('on abort signal', async () => {
    let cleanupCalled = false

    const queryFn = liveQuery(async function* () {
      try {
        yield 1
        await new Promise(resolve => setTimeout(resolve, 50))
        yield 2
        await new Promise(resolve => setTimeout(resolve, 50))
        yield 3
      }
      finally {
        cleanupCalled = true
      }
    })

    const controller = new AbortController()

    const resultPromise = expect(queryFn({
      queryKey: ['live-query'],
      signal: controller.signal,
      client: queryClient,
    } as any)).resolves.toEqual(1)

    await vi.waitFor(() => {
      expect(queryClient.getQueryData(['live-query'])).toEqual(1)
    })

    controller.abort()

    await resultPromise
    expect(cleanupCalled).toBe(true)
  })

  it('throw if no data yielded', async () => {
    const queryFn = liveQuery(async function* () {
      // No yield
    })

    await expect(queryFn({
      queryKey: ['live-query'],
      signal: new AbortController().signal,
      client: queryClient,
    } as any)).rejects.toThrowError(
      'Live query for ["live-query"] did not yield any data. Ensure the query function returns an AsyncIterable with at least one chunk.',
    )
  })
})
