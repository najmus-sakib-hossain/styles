import { isDefinedError } from '@orpc/client'
import { ORPCError } from '@orpc/contract'
import { createInfiniteQuery, createMutation, createQuery, skipToken } from '@tanstack/svelte-query'
import { get } from 'svelte/store'
import { pingHandler, streamedHandler } from '../../server/tests/shared'
import { orpc, queryClient, streamedOrpc } from './shared'

beforeEach(() => {
  queryClient.clear()
  vi.clearAllMocks()
})

it('case: call directly', async () => {
  expect(await orpc.ping.call({ input: 123 })).toEqual({ output: '123' })
})

/**
 * TODO: some problems with svelte-query when testing & access abort signal
 * I think we should wait until v6 for runes api and test on that
 */

it('case: with createQuery', { todo: true }, async () => {
  const query = createQuery(orpc.nested.ping.queryOptions({ input: { input: 123 } }), queryClient)

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

  await vi.waitFor(() => expect(get(query).data).toEqual({ output: '123' }))

  expect(
    queryClient.getQueryData(orpc.nested.ping.key({ input: { input: 123 }, type: 'query' })),
  ).toEqual({ output: '123' })

  pingHandler.mockRejectedValueOnce(new ORPCError('OVERRIDE'))

  get(query).refetch()

  await vi.waitFor(() => {
    expect((get(query) as any).error).toBeInstanceOf(ORPCError)
    expect((get(query) as any).error).toSatisfy(isDefinedError)
    expect((get(query) as any).error.code).toEqual('OVERRIDE')
  })
})

it('case: with createQuery and skipToken', { todo: true }, async () => {
  const query = createQuery(orpc.nested.ping.queryOptions({ input: skipToken }), queryClient)

  expect(get(query).status).toEqual('pending')
  expect(queryClient.isFetching({ queryKey: orpc.key() })).toEqual(0)

  await new Promise(resolve => setTimeout(resolve, 10))

  expect(get(query).status).toEqual('pending')
  expect(queryClient.isFetching({ queryKey: orpc.key() })).toEqual(0)
})

it('case: with streamed/createQuery', { todo: true }, async () => {
  const query = createQuery(streamedOrpc.streamed.experimental_streamedOptions({
    input: { input: 2 },
    queryFnOptions: {
      refetchMode: 'append',
    },
  }), queryClient)

  expect(queryClient.isFetching({ queryKey: streamedOrpc.key() })).toEqual(1)
  expect(queryClient.isFetching({ queryKey: streamedOrpc.streamed.key() })).toEqual(1)
  expect(queryClient.isFetching({ queryKey: streamedOrpc.streamed.key({ input: { input: 2 } }) })).toEqual(1)
  expect(queryClient.isFetching({ queryKey: streamedOrpc.streamed.key({ input: { input: 2 }, type: 'streamed' }) })).toEqual(1)

  expect(queryClient.isFetching({ queryKey: streamedOrpc.streamed.key({ input: { input: 234 }, type: 'query' }) })).toEqual(0)
  expect(queryClient.isFetching({ queryKey: streamedOrpc.streamed.key({ input: { input: 2 }, type: 'infinite' }) })).toEqual(0)
  expect(queryClient.isFetching({ queryKey: streamedOrpc.key({ type: 'infinite' }) })).toEqual(0)

  await vi.waitFor(() => expect(get(query).data).toEqual([{ output: '0' }, { output: '1' }]))

  expect(
    queryClient.getQueryData(streamedOrpc.streamed.key({
      input: { input: 2 },
      type: 'streamed',
      fnOptions: { refetchMode: 'append' },
    })),
  ).toEqual([{ output: '0' }, { output: '1' }])

  // make sure refetch mode works
  get(query).refetch()
  await vi.waitFor(() => expect(get(query).data).toEqual([{ output: '0' }, { output: '1' }, { output: '0' }, { output: '1' }]))

  streamedHandler.mockRejectedValueOnce(new ORPCError('OVERRIDE'))
  get(query).refetch()

  await vi.waitFor(() => {
    expect((get(query) as any).error).toBeInstanceOf(ORPCError)
    expect((get(query) as any).error).toSatisfy(isDefinedError)
    expect((get(query) as any).error.code).toEqual('OVERRIDE')
  })
})

it('case: with streamed/createQuery and skipToken', { todo: true }, async () => {
  const query = createQuery(streamedOrpc.streamed.experimental_streamedOptions({ input: skipToken }), queryClient)

  expect(get(query).status).toEqual('pending')
  expect(queryClient.isFetching({ queryKey: orpc.key() })).toEqual(0)

  await new Promise(resolve => setTimeout(resolve, 10))

  expect(queryClient.isFetching({ queryKey: orpc.key() })).toEqual(0)
  expect(get(query).status).toEqual('pending')
})

it('case: with createInfiniteQuery', { todo: true }, async () => {
  const query = createInfiniteQuery(orpc.nested.ping.infiniteOptions({
    input: pageParam => ({ input: pageParam }),
    getNextPageParam: lastPage => Number(lastPage.output) + 1,
    initialPageParam: 1,
  }), queryClient)

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

  await vi.waitFor(() => expect(get(query).data).toEqual({
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

  get(query).fetchNextPage()

  await vi.waitFor(() => expect(get(query).data).toEqual({
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

  get(query).fetchNextPage()

  await vi.waitFor(() => {
    expect((query as any).error).toBeInstanceOf(ORPCError)
    expect((query as any).error).toSatisfy(isDefinedError)
    expect((query as any).error.code).toEqual('OVERRIDE')
  })
})

it('case: with createInfiniteQuery and skipToken', { todo: true }, async () => {
  const query = createInfiniteQuery(orpc.nested.ping.infiniteOptions({
    input: skipToken,
    getNextPageParam: lastPage => Number(lastPage.output) + 1,
    initialPageParam: 1,
  }), queryClient)

  expect(get(query).status).toEqual('pending')
  expect(queryClient.isFetching({ queryKey: orpc.key() })).toEqual(0)

  await new Promise(resolve => setTimeout(resolve, 10))

  expect(get(query).status).toEqual('pending')
  expect(queryClient.isFetching({ queryKey: orpc.key() })).toEqual(0)
})

it('case: with createMutation', { todo: true }, async () => {
  const query = createMutation(orpc.nested.ping.mutationOptions())

  get(query).mutate({ input: 123 })

  expect(queryClient.isMutating({ mutationKey: orpc.key() })).toEqual(1)
  expect(queryClient.isMutating({ mutationKey: orpc.nested.key() })).toEqual(1)
  expect(queryClient.isMutating({ mutationKey: orpc.nested.ping.key() })).toEqual(1)
  expect(queryClient.isMutating({ mutationKey: orpc.nested.ping.key({ type: 'mutation' }) })).toEqual(1)

  expect(queryClient.isMutating({ mutationKey: orpc.nested.ping.key({ type: 'query' }) })).toEqual(0)
  expect(queryClient.isMutating({ mutationKey: orpc.nested.pong.key() })).toEqual(0)
  expect(queryClient.isMutating({ mutationKey: orpc.ping.key() })).toEqual(0)
  expect(queryClient.isMutating({ mutationKey: orpc.pong.key() })).toEqual(0)

  await vi.waitFor(() => expect(get(query).data).toEqual({ output: '123' }))

  pingHandler.mockRejectedValueOnce(new ORPCError('OVERRIDE'))

  get(query).mutate({ input: 456 })

  await vi.waitFor(() => {
    expect((query as any).error).toBeInstanceOf(ORPCError)
    expect((query as any).error).toSatisfy(isDefinedError)
    expect((query as any).error.code).toEqual('OVERRIDE')
  })
})
