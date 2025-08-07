import { toFetchResponse, toStandardLazyRequest } from '@orpc/standard-server-fetch'
import { FetchHandler } from './handler'

vi.mock('../standard', async origin => ({
  ...await origin(),
  StandardHandler: vi.fn(),
}))

vi.mock('@orpc/standard-server-fetch', async origin => ({
  toStandardLazyRequest: vi.fn((await origin() as any).toStandardLazyRequest),
  toFetchResponse: vi.fn((await origin() as any).toFetchResponse),
}))

beforeEach(() => {
  vi.clearAllMocks()
})

describe('fetchHandler', () => {
  const handle = vi.fn()
  const interceptor = vi.fn(({ next }) => next())

  const handlerOptions = { eventIteratorKeepAliveComment: '__test__', adapterInterceptors: [interceptor] }

  const handler = new FetchHandler({
    handle,
  } as any, handlerOptions)

  const request = new Request('https://example.com/api/v1/users/1', {
    headers: new Headers({ 'content-type': 'application/json' }),
    method: 'POST',
    body: JSON.stringify({ data: { value: '123' }, meta: [] }),
  })

  it('on match', async () => {
    handle.mockReturnValueOnce({ matched: true, response: {
      status: 200,
      headers: {},
      body: '__body__',
    } })

    const options = { prefix: '/api/v1', context: { db: 'postgres' } } as const
    const result = await handler.handle(request, options)

    expect(result).toEqual({
      matched: true,
      response: vi.mocked(toFetchResponse).mock.results[0]!.value,
    })

    expect(handle).toHaveBeenCalledOnce()
    expect(handle).toHaveBeenCalledWith(
      vi.mocked(toStandardLazyRequest).mock.results[0]!.value,
      options,
    )

    expect(vi.mocked(toStandardLazyRequest)).toHaveBeenCalledOnce()
    expect(vi.mocked(toStandardLazyRequest)).toHaveBeenCalledWith(request)

    expect(vi.mocked(toFetchResponse)).toHaveBeenCalledOnce()
    expect(vi.mocked(toFetchResponse)).toHaveBeenCalledWith({
      status: 200,
      headers: {},
      body: '__body__',
    }, handlerOptions)

    expect(interceptor).toHaveBeenCalledOnce()
    expect(interceptor).toHaveBeenCalledWith({
      ...options,
      request,
      toFetchResponseOptions: handlerOptions,
      next: expect.any(Function),
    })
    expect(await interceptor.mock.results[0]!.value).toEqual({
      matched: true,
      response: vi.mocked(toFetchResponse).mock.results[0]!.value,
    })
  })

  it('on mismatch', async () => {
    handle.mockReturnValueOnce({
      matched: false,
      response: undefined,
    })

    const options = { prefix: '/api/v1', context: { db: 'postgres' } } as const
    const result = await handler.handle(request, options)

    expect(result).toEqual({
      matched: false,
      response: undefined,
    })

    expect(handle).toHaveBeenCalledOnce()
    expect(handle).toHaveBeenCalledWith(
      vi.mocked(toStandardLazyRequest).mock.results[0]!.value,
      { prefix: '/api/v1', context: { db: 'postgres' } },
    )

    expect(vi.mocked(toStandardLazyRequest)).toHaveBeenCalledOnce()
    expect(vi.mocked(toStandardLazyRequest)).toHaveBeenCalledWith(request)

    expect(vi.mocked(toFetchResponse)).not.toHaveBeenCalled()

    expect(interceptor).toHaveBeenCalledOnce()
    expect(interceptor).toHaveBeenCalledWith({
      ...options,
      request,
      next: expect.any(Function),
      toFetchResponseOptions: handlerOptions,
    })
    expect(await interceptor.mock.results[0]!.value).toEqual({
      matched: false,
      response: undefined,
    })
  })

  it('plugins', () => {
    const initRuntimeAdapter = vi.fn()

    const handler = new FetchHandler({
      handle,
    } as any, {
      plugins: [
        { initRuntimeAdapter },
      ],
      eventIteratorKeepAliveComment: '__test__',
    })

    expect(initRuntimeAdapter).toHaveBeenCalledOnce()
    expect(initRuntimeAdapter).toHaveBeenCalledWith({
      plugins: [
        { initRuntimeAdapter },
      ],
      eventIteratorKeepAliveComment: '__test__',
    })
  })
})
