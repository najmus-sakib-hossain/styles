import { isDefinedError } from '@orpc/client'
import { ORPCError } from '@orpc/contract'
import { renderHook } from '@solidjs/testing-library'
import { skipToken, useInfiniteQuery, useMutation, useQuery } from '@tanstack/solid-query'
import { pingHandler, streamedHandler } from '../../server/tests/shared'
import { orpc, queryClient, streamedOrpc } from './shared'

beforeEach(() => {
  queryClient.clear()
  vi.clearAllMocks()
})

it('case: call directly', async () => {
  expect(await orpc.ping.call({ input: 123 })).toEqual({ output: '123' })
})

it('case: with useQuery', async () => {
  const { result: query } = renderHook(() => useQuery(() => orpc.nested.ping.queryOptions({ input: { input: 123 } }), () => queryClient))

  expect(queryClient.isFetching({ queryKey: orpc.key() })).toEqual(1)
  expect(queryClient.isFetching({ queryKey: orpc.nested.key() })).toEqual(1)
  expect(queryClient.isFetching({ queryKey: orpc.nested.ping.key() })).toEqual(1)
  expect(queryClient.isFetching({ queryKey: orpc.nested.ping.key({ input: { input: 123 } }) })).toEqual(1)
  expect(queryClient.isFetching({ queryKey: orpc.nested.ping.key({ input: { input: 123 }, type: 'query' }) })).toEqual(1)

  expect(queryClient.isFetching({ queryKey: orpc.nested.ping.key({ input: { input: 234 }, type: 'query' }) })).toEqual(0)
  expect(queryClient.isFetching({ queryKey: orpc.nested.ping.key({ input: { input: 123 }, type: 'infinite' }) })).toEqual(0)
  expect(queryClient.isFetching({ queryKey: orpc.nested.pong.key() })).toEqual(0)
  expect(queryClient.isFetching({ queryKey: orpc.ping.key() })).toEqual(0)
  expect(queryClient.isFetching({ queryKey: orpc.pong.key() })).toEqual(0)

  await vi.waitFor(() => expect(query.data).toEqual({ output: '123' }))

  expect(
    queryClient.getQueryData(orpc.nested.ping.key({ input: { input: 123 }, type: 'query' })),
  ).toEqual({ output: '123' })

  pingHandler.mockRejectedValueOnce(new ORPCError('OVERRIDE'))

  query.refetch()

  await vi.waitFor(() => {
    expect((query as any).error).toBeInstanceOf(ORPCError)
    expect((query as any).error).toSatisfy(isDefinedError)
    expect((query as any).error.code).toEqual('OVERRIDE')
  })
})

it('case: with useQuery with skipToken', async () => {
  const { result: query } = renderHook(() => useQuery(() => orpc.nested.ping.queryOptions({ input: skipToken }), () => queryClient))

  expect(query.status).toEqual('pending')
  expect(queryClient.isFetching({ queryKey: orpc.key() })).toEqual(0)

  await new Promise(resolve => setTimeout(resolve, 10))

  expect(query.status).toEqual('pending')
  expect(queryClient.isFetching({ queryKey: orpc.key() })).toEqual(0)
})

it('case: with streamed/useQuery', async () => {
  const { result } = renderHook(() => useQuery(() => streamedOrpc.streamed.experimental_streamedOptions({
    input: { input: 2 },
    queryFnOptions: {
      refetchMode: 'append',
    },
  }), () => queryClient))

  expect(queryClient.isFetching({ queryKey: streamedOrpc.key() })).toEqual(1)
  expect(queryClient.isFetching({ queryKey: streamedOrpc.streamed.key() })).toEqual(1)
  expect(queryClient.isFetching({ queryKey: streamedOrpc.streamed.key({ input: { input: 2 } }) })).toEqual(1)
  expect(queryClient.isFetching({ queryKey: streamedOrpc.streamed.key({ input: { input: 2 }, type: 'streamed' }) })).toEqual(1)

  expect(queryClient.isFetching({ queryKey: streamedOrpc.streamed.key({ input: { input: 234 }, type: 'query' }) })).toEqual(0)
  expect(queryClient.isFetching({ queryKey: streamedOrpc.streamed.key({ input: { input: 2 }, type: 'infinite' }) })).toEqual(0)
  expect(queryClient.isFetching({ queryKey: streamedOrpc.key({ type: 'infinite' }) })).toEqual(0)

  await vi.waitFor(() => expect(result.data).toEqual([{ output: '0' }, { output: '1' }]))

  expect(
    queryClient.getQueryData(streamedOrpc.streamed.key({ input: { input: 2 }, type: 'streamed', fnOptions: { refetchMode: 'append' } })),
  ).toEqual([{ output: '0' }, { output: '1' }])

  // make sure refetch mode works
  result.refetch()
  await vi.waitFor(() => expect(result.data).toEqual([{ output: '0' }, { output: '1' }, { output: '0' }, { output: '1' }]))

  streamedHandler.mockRejectedValueOnce(new ORPCError('OVERRIDE'))
  result.refetch()

  await vi.waitFor(() => {
    expect((result as any).error).toBeInstanceOf(ORPCError)
    expect((result as any).error).toSatisfy(isDefinedError)
    expect((result as any).error.code).toEqual('OVERRIDE')
  })
})

it('case: with streamed/useQuery and skipToken', async () => {
  const { result } = renderHook(() => useQuery(() => streamedOrpc.streamed.experimental_streamedOptions({ input: skipToken }), () => queryClient))

  expect(result.status).toEqual('pending')
  expect(queryClient.isFetching({ queryKey: orpc.key() })).toEqual(0)

  await new Promise(resolve => setTimeout(resolve, 10))

  expect(queryClient.isFetching({ queryKey: orpc.key() })).toEqual(0)
  expect(result.status).toEqual('pending')
})

it('case: with useInfiniteQuery', async () => {
  const { result: query } = renderHook(() => useInfiniteQuery(() => orpc.nested.ping.infiniteOptions({
    input: pageParam => ({ input: pageParam }),
    getNextPageParam: lastPage => Number(lastPage.output) + 1,
    initialPageParam: 1,
  }), () => queryClient))

  expect(queryClient.isFetching({ queryKey: orpc.key() })).toEqual(1)
  expect(queryClient.isFetching({ queryKey: orpc.nested.key() })).toEqual(1)
  expect(queryClient.isFetching({ queryKey: orpc.nested.ping.key() })).toEqual(1)
  expect(queryClient.isFetching({ queryKey: orpc.nested.ping.key({ input: { input: 1 } }) })).toEqual(1)
  expect(queryClient.isFetching({ queryKey: orpc.nested.ping.key({ input: { input: 1 }, type: 'infinite' }) })).toEqual(1)

  expect(queryClient.isFetching({ queryKey: orpc.nested.ping.key({ input: { input: 2 }, type: 'infinite' }) })).toEqual(0)
  expect(queryClient.isFetching({ queryKey: orpc.nested.ping.key({ input: { input: 1 }, type: 'query' }) })).toEqual(0)
  expect(queryClient.isFetching({ queryKey: orpc.nested.pong.key() })).toEqual(0)
  expect(queryClient.isFetching({ queryKey: orpc.ping.key() })).toEqual(0)
  expect(queryClient.isFetching({ queryKey: orpc.pong.key() })).toEqual(0)

  await vi.waitFor(() => expect(query.data).toEqual({
    pageParams: [1],
    pages: [
      { output: '1' },
    ],
  }))

  expect(
    queryClient.getQueryData(orpc.nested.ping.key({ input: { input: 1 }, type: 'infinite' })),
  ).toEqual({
    pageParams: [1],
    pages: [
      { output: '1' },
    ],
  })

  query.fetchNextPage()

  await vi.waitFor(() => expect(query.data).toEqual({
    pageParams: [1, 2],
    pages: [
      { output: '1' },
      { output: '2' },
    ],
  }))

  expect(
    queryClient.getQueryData(orpc.nested.ping.key({ input: { input: 1 }, type: 'infinite' })),
  ).toEqual({
    pageParams: [1, 2],
    pages: [
      { output: '1' },
      { output: '2' },
    ],
  })

  pingHandler.mockRejectedValueOnce(new ORPCError('OVERRIDE'))

  query.fetchNextPage()

  await vi.waitFor(() => {
    expect((query as any).error).toBeInstanceOf(ORPCError)
    expect((query as any).error).toSatisfy(isDefinedError)
    expect((query as any).error.code).toEqual('OVERRIDE')
  })
})

it('case: with useInfiniteQuery with skipToken', async () => {
  const { result: query } = renderHook(() => useInfiniteQuery(() => orpc.nested.ping.infiniteOptions({
    input: skipToken,
    getNextPageParam: lastPage => Number(lastPage.output) + 1,
    initialPageParam: 1,
  }), () => queryClient))

  expect(query.status).toEqual('pending')
  expect(queryClient.isFetching({ queryKey: orpc.key() })).toEqual(0)

  await new Promise(resolve => setTimeout(resolve, 10))

  expect(query.status).toEqual('pending')
  expect(queryClient.isFetching({ queryKey: orpc.key() })).toEqual(0)
})

it('case: with useMutation', async () => {
  const { result: query } = renderHook(() => useMutation(() => orpc.nested.ping.mutationOptions(), () => queryClient))

  query.mutate({ input: 123 })

  expect(queryClient.isMutating({ mutationKey: orpc.key() })).toEqual(1)
  expect(queryClient.isMutating({ mutationKey: orpc.nested.key() })).toEqual(1)
  expect(queryClient.isMutating({ mutationKey: orpc.nested.ping.key() })).toEqual(1)
  expect(queryClient.isMutating({ mutationKey: orpc.nested.ping.key({ type: 'mutation' }) })).toEqual(1)

  expect(queryClient.isMutating({ mutationKey: orpc.nested.ping.key({ type: 'query' }) })).toEqual(0)
  expect(queryClient.isMutating({ mutationKey: orpc.nested.pong.key() })).toEqual(0)
  expect(queryClient.isMutating({ mutationKey: orpc.ping.key() })).toEqual(0)
  expect(queryClient.isMutating({ mutationKey: orpc.pong.key() })).toEqual(0)

  await vi.waitFor(() => expect(query.data).toEqual({ output: '123' }))

  pingHandler.mockRejectedValueOnce(new ORPCError('OVERRIDE'))

  query.mutate({ input: 456 })

  await vi.waitFor(() => {
    expect((query as any).error).toBeInstanceOf(ORPCError)
    expect((query as any).error).toSatisfy(isDefinedError)
    expect((query as any).error.code).toEqual('OVERRIDE')
  })
})
