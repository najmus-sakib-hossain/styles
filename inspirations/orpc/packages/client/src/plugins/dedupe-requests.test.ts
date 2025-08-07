import type { StandardLazyResponse, StandardRequest } from '@orpc/standard-server'
import * as StandardServerModule from '@orpc/standard-server'
import * as StandardServerBatchModule from '@orpc/standard-server/batch'
import { StandardLink } from '../adapters/standard'
import { DedupeRequestsPlugin } from './dedupe-requests'

const toBatchSignalSpy = vi.spyOn(StandardServerBatchModule, 'toBatchAbortSignal')
const replicateStandardLazyResponseSpy = vi.spyOn(StandardServerModule, 'replicateStandardLazyResponse')

beforeEach(() => {
  vi.resetAllMocks()
})

describe('dedupeRequestsPlugin', () => {
  const signal1 = AbortSignal.timeout(1000)
  const signal2 = AbortSignal.timeout(1000)

  const clientCall = vi.fn(async (request) => {
    return {
      status: 200,
      headers: {
        'x-custom': '1',
      },
      body: async () => ({ value: '__body__' }),
    } satisfies StandardLazyResponse
  })

  const groupCondition = vi.fn(() => true)

  const encode = vi.fn(async (path, input, { signal }): Promise<StandardRequest> => ({
    url: new URL(`http://localhost/prefix/${path.slice(1).join('/')}`),
    method: path[0] as any,
    headers: {
      bearer: '123',
      path,
    },
    body: input,
    signal,
  }))

  const decode = vi.fn(async (response): Promise<unknown> => response.body())
  const filter = vi.fn(() => true)

  const link = new StandardLink({ encode, decode }, { call: clientCall }, {
    plugins: [new DedupeRequestsPlugin({
      groups: [{
        condition: groupCondition,
        context: { group: true } as any,
      }],
      filter,
    })],
  })

  it.each(['GET', 'POST', 'PUT', 'DELETE', 'PATCH'])('dedupe requests with %s method', async (method) => {
    const [output1, output2] = await Promise.all([
      link.call([method, 'foo'], '__foo__', { context: { foo1: true }, signal: signal1 }),
      link.call([method, 'foo'], '__foo__', { context: { foo2: true }, signal: signal2 }),
    ])

    expect(output1).toEqual({ value: '__body__' })
    expect(output2).toEqual({ value: '__body__' })
    expect(output1).toBe(output2)

    expect(encode).toHaveBeenCalledTimes(2)

    expect(clientCall).toHaveBeenCalledTimes(1)
    expect(clientCall).toHaveBeenCalledWith(
      {
        ...await encode.mock.results[0]!.value,
        signal: expect.toSatisfy(signal => signal === toBatchSignalSpy.mock.results[0]!.value),
      },
      {
        context: { group: true },
        signal: expect.toSatisfy(signal => signal === toBatchSignalSpy.mock.results[0]!.value),
        next: expect.any(Function),
      },
      [
        method,
        'foo',
      ],
      '__foo__',
    )

    expect(toBatchSignalSpy).toHaveBeenCalledTimes(1)
    expect(toBatchSignalSpy).toHaveBeenCalledWith([
      signal1,
      signal2,
    ])

    expect(replicateStandardLazyResponseSpy).toHaveBeenCalledTimes(1)
    expect(replicateStandardLazyResponseSpy).toHaveBeenCalledWith(await clientCall.mock.results[0]!.value, 2)

    expect(groupCondition).toHaveBeenCalledTimes(2)
    expect(groupCondition).toHaveBeenNthCalledWith(1, expect.objectContaining({
      path: [method, 'foo'],
      request: await encode.mock.results[0]!.value,
      context: { foo1: true },
    }))
    expect(groupCondition).toHaveBeenNthCalledWith(2, expect.objectContaining({
      path: [method, 'foo'],
      request: await encode.mock.results[1]!.value,
      context: { foo2: true },
    }))
  })

  it('dedupe requests and request throw error', async () => {
    clientCall.mockRejectedValue(new Error('__error__'))

    const promise1 = link.call(['GET', 'foo'], '__foo__', { context: { foo1: true }, signal: signal1 })
    const promise2 = link.call(['GET', 'foo'], '__foo__', { context: { foo2: true }, signal: signal2 })

    await expect(promise1).rejects.toThrow('__error__')
    await expect(promise2).rejects.toThrow('__error__')

    expect(clientCall).toHaveBeenCalledTimes(1)
  })

  it.each([
    ['blob', new Blob(['test'], { type: 'text/plain' })],
    ['formdata', new FormData()],
    ['url-search-params', new URLSearchParams()],
    ['event-iterator', (async function* () { }())],
    ['different in body', { value: 1 }, { value: 2 }],
  ])('not dedupe requests with %s body', async (name, body1, body2 = body1 as any) => {
    const [output1, output2] = await Promise.all([
      link.call(['GET', 'foo'], body1, { context: { foo: true }, signal: signal1 }),
      link.call(['GET', 'foo'], body2, { context: { foo: true }, signal: signal2 }),
    ])

    expect(output1).not.toBe(output2)
    expect(encode).toHaveBeenCalledTimes(2)
    expect(clientCall).toHaveBeenCalledTimes(2)
  })

  it('not dedupe if filter returns false', async () => {
    filter.mockReturnValueOnce(false)

    const [output1, output2] = await Promise.all([
      link.call(['GET', 'foo'], '__foo__', { context: { foo1: true }, signal: signal1 }),
      link.call(['GET', 'foo'], '__foo__', { context: { foo2: true }, signal: signal2 }),
    ])

    expect(output1).not.toBe(output2)
    expect(encode).toHaveBeenCalledTimes(2)
    expect(clientCall).toHaveBeenCalledTimes(2)
  })

  it('not dedupe if not group matches', async () => {
    groupCondition.mockReturnValueOnce(false)

    const [output1, output2] = await Promise.all([
      link.call(['GET', 'foo'], '__foo__', { context: { foo1: true }, signal: signal1 }),
      link.call(['GET', 'foo'], '__foo__', { context: { foo2: true }, signal: signal2 }),
    ])

    expect(output1).not.toBe(output2)
    expect(encode).toHaveBeenCalledTimes(2)
    expect(clientCall).toHaveBeenCalledTimes(2)
  })

  it('not dedupe if method is different', async () => {
    const [output1, output2] = await Promise.all([
      link.call(['GET', 'foo'], '__foo__', { context: { foo1: true }, signal: signal1 }),
      link.call(['POST', 'foo'], '__foo__', { context: { foo2: true }, signal: signal2 }),
    ])

    expect(output1).not.toBe(output2)
    expect(encode).toHaveBeenCalledTimes(2)
    expect(clientCall).toHaveBeenCalledTimes(2)
  })

  it('not dedupe if url is different', async () => {
    const [output1, output2] = await Promise.all([
      link.call(['GET', 'foo1'], '__foo__', { context: { foo1: true }, signal: signal1 }),
      link.call(['GET', 'foo2'], '__foo__', { context: { foo2: true }, signal: signal2 }),
    ])

    expect(output1).not.toBe(output2)
    expect(encode).toHaveBeenCalledTimes(2)
    expect(clientCall).toHaveBeenCalledTimes(2)
  })

  it('partial dedupe requests', async () => {
    const [output1, output2, output3] = await Promise.all([
      link.call(['GET', 'foo'], '__foo__', { context: { foo1: true }, signal: signal1 }),
      link.call(['GET', 'foo'], '__foo__', { context: { foo2: true }, signal: signal2 }),
      link.call(['POST', 'foo'], '__foo__', { context: { foo2: true }, signal: signal2 }),
    ])

    expect(output1).toBe(output2)
    expect(output2).not.toBe(output3)
    expect(encode).toHaveBeenCalledTimes(3)
    expect(clientCall).toHaveBeenCalledTimes(2)
  })
})
