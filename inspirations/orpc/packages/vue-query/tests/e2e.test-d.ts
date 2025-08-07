import type { InfiniteData } from '@tanstack/vue-query'
import { isDefinedError } from '@orpc/client'
import { useInfiniteQuery, useMutation, useQueries, useQuery } from '@tanstack/vue-query'
import { computed, ref } from 'vue'
import { orpc as client } from '../../client/tests/shared'
import { orpc, queryClient, streamedOrpc } from './shared'

it('.key', () => {
  queryClient.invalidateQueries({
    queryKey: orpc.nested.key({ type: 'query' }),
  })

  orpc.ping.key({})
  // @ts-expect-error --- input is invalid
  orpc.ping.key({ input: { input: 'INVALID' } })
})

it('.call', () => {
  expectTypeOf(orpc.ping.call).toEqualTypeOf(client.ping)
})

describe('.queryOptions', () => {
  it('useQuery', () => {
    const query = useQuery(orpc.ping.queryOptions({
      input: computed(() => ({ input: ref(123) })),
      retry(failureCount, error) {
        if (isDefinedError(error) && error.code === 'BASE') {
          expectTypeOf(error.data).toEqualTypeOf<{ output: string }>()
        }

        return false
      },
    }))

    if (isDefinedError(query.error.value) && query.error.value.code === 'OVERRIDE') {
      expectTypeOf(query.error.value.data).toEqualTypeOf<unknown>()
    }

    expectTypeOf(query.data.value).toEqualTypeOf<{ output: string } | undefined>()

    useQuery(orpc.ping.queryOptions({
      // @ts-expect-error --- input is invalid
      input: {
        input: '123',
      },
    }))

    useQuery(orpc.ping.queryOptions({
      input: { input: 123 },
      // @ts-expect-error --- cache is invalid
      context: {
        cache: 123,
      },
    }))
  })

  it('useQueries', async () => {
    const queries = useQueries({
      queries: [
        orpc.ping.queryOptions({
          input: computed(() => ({ input: ref(123) })),
          select: data => ({ mapped: data }),
          retry(failureCount, error) {
            if (isDefinedError(error) && error.code === 'BASE') {
              expectTypeOf(error.data).toEqualTypeOf<{ output: string }>()
            }

            return false
          },
        }),
        orpc.nested.pong.queryOptions({
          context: { cache: '123' },
        }),
      ],
    })

    if (isDefinedError(queries.value[0].error) && queries.value[0].error.code === 'BASE') {
      expectTypeOf(queries.value[0].error.data).toEqualTypeOf<{ output: string }>()
    }

    if (queries.value[0].status === 'success') {
      expectTypeOf(queries.value[0].data.mapped).toEqualTypeOf<{ output: string }>()
    }

    if (queries.value[1].status === 'error') {
      expectTypeOf(queries.value[1].error).toEqualTypeOf<Error>()
    }

    if (queries.value[1].status === 'success') {
      expectTypeOf(queries.value[1].data).toEqualTypeOf<unknown>()
    }
  })

  it('fetchQuery', async () => {
    const query = await queryClient.fetchQuery(orpc.ping.queryOptions({
      input: { input: 123 },
    }))

    expectTypeOf(query).toEqualTypeOf<{ output: string }>()

    const query2 = await queryClient.fetchQuery(orpc.ping.queryOptions({
      input: { input: 123 },
    }))

    expectTypeOf(query2).toEqualTypeOf<{ output: string }>()
  })
})

describe('.streamedOptions', () => {
  it('useQuery', () => {
    const query = useQuery(streamedOrpc.streamed.experimental_streamedOptions({
      input: computed(() => ({ input: 123 })),
      retry(failureCount, error) {
        if (isDefinedError(error) && error.code === 'BASE') {
          expectTypeOf(error.data).toEqualTypeOf<{ output: string }>()
        }

        return false
      },
    }))

    if (query.status.value === 'error' && isDefinedError(query.error.value) && query.error.value.code === 'OVERRIDE') {
      expectTypeOf(query.error.value.data).toEqualTypeOf<unknown>()
    }

    expectTypeOf(query.data.value).toEqualTypeOf<{ output: string }[] | undefined>()

    useQuery(orpc.ping.experimental_streamedOptions({
      // @ts-expect-error --- input is invalid
      input: {
        input: '123',
      },
    }))

    useQuery(orpc.ping.experimental_streamedOptions({
      input: { input: 123 },
      // @ts-expect-error --- cache is invalid
      context: {
        cache: 123,
      },
    }))
  })

  it('useQueries', async () => {
    const queries = useQueries({
      queries: [
        streamedOrpc.streamed.experimental_streamedOptions({
          input: { input: 123 },
          select: data => ({ mapped: data }),
          retry(failureCount, error) {
            if (isDefinedError(error) && error.code === 'BASE') {
              expectTypeOf(error.data).toEqualTypeOf<{ output: string }>()
            }

            return false
          },
        }),
        orpc.nested.pong.queryOptions({
          context: { cache: '123' },
        }),
      ],
    })

    if (queries.value[0].status === 'error' && isDefinedError(queries.value[0].error) && queries.value[0].error.code === 'BASE') {
      expectTypeOf(queries.value[0].error.data).toEqualTypeOf<{ output: string }>()
    }

    if (queries.value[0].status === 'success') {
      expectTypeOf(queries.value[0].data.mapped).toEqualTypeOf<{ output: string }[]>()
    }

    if (queries.value[1].status === 'error') {
      expectTypeOf(queries.value[1].error).toEqualTypeOf<Error>()
    }

    if (queries.value[1].status === 'success') {
      expectTypeOf(queries.value[1].data).toEqualTypeOf<unknown>()
    }
  })

  it('fetchQuery', async () => {
    const query = await queryClient.fetchQuery(streamedOrpc.streamed.experimental_streamedOptions({
      input: { input: 123 },
    }))

    expectTypeOf(query).toEqualTypeOf<{ output: string }[]>()
  })
})

describe('.infiniteOptions', () => {
  it('useInfiniteQuery', () => {
    const query = useInfiniteQuery(orpc.nested.ping.infiniteOptions({
      input: pagePram => computed(() => ({ input: ref(pagePram) })),
      getNextPageParam: () => 2,
      initialPageParam: 2,
      retry(failureCount, error) {
        if (isDefinedError(error) && error.code === 'BASE') {
          expectTypeOf(error.data).toEqualTypeOf<{ output: string }>()
        }

        return false
      },
    }))

    if (isDefinedError(query.error.value) && query.error.value.code === 'OVERRIDE') {
      expectTypeOf(query.error.value.data).toEqualTypeOf<unknown>()
    }

    expectTypeOf(query.data.value?.pages[0]).toEqualTypeOf<{ output: string } | undefined>()

    // @ts-expect-error --- input is invalid
    useInfiniteQuery(orpc.nested.ping.infiniteOptions({
      // @ts-expect-error --- input is invalid
      input: pagePram => ({
        input: pagePram,
      }),
      getNextPageParam: () => '2',
      initialPageParam: '2',
    }))

    // @ts-expect-error --- cache is invalid
    useInfiniteQuery(orpc.nested.ping.infiniteOptions({
      input: pagePram => computed(() => ({ input: ref(pagePram) })),
      context: {
        // @ts-expect-error --- cache is invalid
        cache: 123,
      },
      getNextPageParam: () => 2,
      initialPageParam: 1,
    }))
  })

  it('fetchInfiniteQuery', async () => {
    const query = await queryClient.fetchInfiniteQuery(orpc.nested.ping.infiniteOptions({
      input: pagePram => computed(() => ({ input: ref(pagePram) })),
      getNextPageParam: () => 2,
      initialPageParam: 2,
    }))

    expectTypeOf(query).toEqualTypeOf<InfiniteData<{ output: string }, number>>()
  })
})

describe('.mutationOptions', () => {
  it('useMutation', async () => {
    const mutation = useMutation(orpc.ping.mutationOptions({
      onError(error, variables) {
        if (isDefinedError(error) && error.code === 'BASE') {
          expectTypeOf(error.data).toEqualTypeOf<{ output: string }>()
        }
      },
    }))

    if (isDefinedError(mutation.error.value) && mutation.error.value.code === 'OVERRIDE') {
      expectTypeOf(mutation.error.value.data).toEqualTypeOf<unknown>()
    }

    expectTypeOf(mutation.data.value).toEqualTypeOf<{ output: string } | undefined>()

    mutation.mutate({ input: 123 })

    mutation.mutateAsync({
    // @ts-expect-error --- input is invalid
      input: 'INVALID',
    })

    useMutation(orpc.ping.mutationOptions({
      context: {
        // @ts-expect-error --- cache is invalid
        cache: 123,
      },
    }))
  })
})
