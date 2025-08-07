import type { Client } from '@orpc/client'
import type { ErrorFromErrorMap } from '@orpc/contract'
import type { GetNextPageParamFunction, InfiniteData } from '@tanstack/react-query'
import type { baseErrorMap } from '../../contract/tests/shared'
import type { ProcedureUtils } from './procedure-utils'
import { skipToken, useInfiniteQuery, useMutation, useQueries, useQuery, useSuspenseInfiniteQuery, useSuspenseQueries, useSuspenseQuery } from '@tanstack/react-query'
import { queryClient } from '../tests/shared'

describe('ProcedureUtils', () => {
  type UtilsInput = { search?: string, cursor?: number } | undefined
  type UtilsOutput = { title: string }[]

  const condition = {} as boolean

  const utils = {} as ProcedureUtils<
    { batch?: boolean },
    UtilsInput,
    UtilsOutput,
    ErrorFromErrorMap<typeof baseErrorMap>
  >

  it('.call', () => {
    expectTypeOf(utils.call).toEqualTypeOf<
      Client<
        { batch?: boolean },
        UtilsInput,
        UtilsOutput,
        ErrorFromErrorMap<typeof baseErrorMap>
      >
    >()
  })

  describe('.queryOptions', () => {
    it('can optional options', () => {
      const requiredUtils = {} as ProcedureUtils<{ batch: boolean }, 'input', UtilsOutput, Error>

      utils.queryOptions()
      utils.queryOptions({ context: { batch: true } })
      utils.queryOptions({ input: { search: 'search' } })
      utils.queryOptions({ input: condition ? skipToken : { search: 'search' } })

      requiredUtils.queryOptions({
        context: { batch: true },
        input: 'input',
      })
      requiredUtils.queryOptions({
        context: { batch: true },
        input: condition ? skipToken : 'input',
      })
      // @ts-expect-error input and context is required
      requiredUtils.queryOptions()
      // @ts-expect-error input and context is required
      requiredUtils.queryOptions({})
      // @ts-expect-error input is required
      requiredUtils.queryOptions({ context: { batch: true } })
      // @ts-expect-error context is required
      requiredUtils.queryOptions({ input: 'input' })
      // @ts-expect-error context is required
      requiredUtils.queryOptions({ input: condition ? skipToken : 'input' })
    })

    it('infer correct input type', () => {
      utils.queryOptions({ input: { cursor: 1 }, context: { batch: true } })
      utils.queryOptions({ input: condition ? { cursor: 2 } : skipToken, context: { batch: true } })
      // @ts-expect-error invalid input
      utils.queryOptions({ input: { cursor: 'invalid' }, context: { batch: true } })
      // @ts-expect-error invalid input
      utils.queryOptions({ input: condition ? { cursor: 'invalid' } : skipToken, context: { batch: true } })
    })

    it('infer correct context type', () => {
      utils.queryOptions({ context: { batch: true } })
      // @ts-expect-error invalid context
      utils.queryOptions({ context: { batch: 'invalid' } })
    })

    describe('works with useQuery', () => {
      it('without initial data', () => {
        const query = useQuery(utils.queryOptions({
          select: data => ({ mapped: data }),
          throwOnError(error) {
            expectTypeOf(error).toEqualTypeOf<ErrorFromErrorMap<typeof baseErrorMap>>()
            return false
          },
        }))

        expectTypeOf(query.data).toEqualTypeOf<{ mapped: UtilsOutput } | undefined>()
        expectTypeOf(query.error).toEqualTypeOf<ErrorFromErrorMap<typeof baseErrorMap> | null>()
      })

      it('with initial data', () => {
        const query = useQuery(utils.queryOptions({
          select: data => ({ mapped: data }),
          initialData: [{ title: 'title' }],
        }))

        expectTypeOf(query.data).toEqualTypeOf<{ mapped: UtilsOutput }>()
        expectTypeOf(query.error).toEqualTypeOf<ErrorFromErrorMap<typeof baseErrorMap> | null>()
      })
    })

    it('works with useSuspenseQuery', () => {
      const query = useSuspenseQuery(utils.queryOptions({
        select: data => ({ mapped: data }),
        retry(failureCount, error) {
          expectTypeOf(error).toEqualTypeOf<ErrorFromErrorMap<typeof baseErrorMap>>()
          return false
        },
      }))

      expectTypeOf(query.data).toEqualTypeOf<{ mapped: UtilsOutput }>()
      expectTypeOf(query.error).toEqualTypeOf<ErrorFromErrorMap<typeof baseErrorMap> | null>()
    })

    it('works with useQueries', async () => {
      const queries = useQueries({
        queries: [
          utils.queryOptions({
            select: data => ({ mapped: data }),
          }),
          utils.queryOptions({
            input: { search: 'search' },
            context: { batch: true },
          }),
        ],
      })

      expectTypeOf(queries[0].data).toEqualTypeOf<{ mapped: UtilsOutput } | undefined>()
      expectTypeOf(queries[1].data).toEqualTypeOf<UtilsOutput | undefined>()

      expectTypeOf(queries[0].error).toEqualTypeOf<null | ErrorFromErrorMap<typeof baseErrorMap>>()
      expectTypeOf(queries[1].error).toEqualTypeOf<null | ErrorFromErrorMap<typeof baseErrorMap>>()
    })

    it('works with useSuspenseQueries', () => {
      const queries = useSuspenseQueries({
        queries: [
          utils.queryOptions({
            select: data => ({ mapped: data }),
          }),
          utils.queryOptions({
            input: { search: 'search' },
            context: { batch: true },
          }),
        ],
      })

      expectTypeOf(queries[0].data).toEqualTypeOf<{ mapped: UtilsOutput }>()
      expectTypeOf(queries[1].data).toEqualTypeOf<UtilsOutput>()

      expectTypeOf(queries[0].error).toEqualTypeOf<null | ErrorFromErrorMap<typeof baseErrorMap>>()
      expectTypeOf(queries[1].error).toEqualTypeOf<null | ErrorFromErrorMap<typeof baseErrorMap>>()
    })

    it('works with fetchQuery', () => {
      expectTypeOf(
        queryClient.fetchQuery(utils.queryOptions()),
      ).toEqualTypeOf<
        Promise<UtilsOutput>
      >()
    })
  })

  describe('.streamedOptions', () => {
    const utils = {} as ProcedureUtils<{ batch?: boolean }, UtilsInput, AsyncIterable<UtilsOutput[number]>, ErrorFromErrorMap<typeof baseErrorMap>>

    it('can optional options', () => {
      const requiredUtils = {} as ProcedureUtils<{ batch: boolean }, 'input', UtilsOutput, Error>

      utils.experimental_streamedOptions()
      utils.experimental_streamedOptions({ context: { batch: true } })
      utils.experimental_streamedOptions({ input: { search: 'search' } })
      utils.experimental_streamedOptions({ input: condition ? skipToken : { search: 'search' } })

      requiredUtils.experimental_streamedOptions({
        context: { batch: true },
        input: 'input',
      })
      requiredUtils.experimental_streamedOptions({
        context: { batch: true },
        input: condition ? skipToken : 'input',
      })
      // @ts-expect-error input and context is required
      requiredUtils.experimental_streamedOptions()
      // @ts-expect-error input and context is required
      requiredUtils.experimental_streamedOptions({})
      // @ts-expect-error input is required
      requiredUtils.experimental_streamedOptions({ context: { batch: true } })
      // @ts-expect-error context is required
      requiredUtils.experimental_streamedOptions({ input: 'input' })
      // @ts-expect-error context is required
      requiredUtils.experimental_streamedOptions({ input: condition ? skipToken : 'input' })
    })

    it('infer correct input type', () => {
      utils.experimental_streamedOptions({ input: { cursor: 1 }, context: { batch: true } })
      utils.experimental_streamedOptions({ input: condition ? { cursor: 2 } : skipToken, context: { batch: true } })
      // @ts-expect-error invalid input
      utils.experimental_streamedOptions({ input: { cursor: 'invalid' }, context: { batch: true } })
      // @ts-expect-error invalid input
      utils.experimental_streamedOptions({ input: condition ? { cursor: 'invalid' } : skipToken, context: { batch: true } })
    })

    it('infer correct context type', () => {
      utils.experimental_streamedOptions({ context: { batch: true } })
      // @ts-expect-error invalid context
      utils.experimental_streamedOptions({ context: { batch: 'invalid' } })
    })

    it('not usable in non event iterator output', () => {
      const utils = {} as ProcedureUtils<{ batch?: boolean }, UtilsInput, UtilsOutput, ErrorFromErrorMap<typeof baseErrorMap>>
      const query = useQuery(utils.experimental_streamedOptions())
      expectTypeOf(query.data).toExtend<undefined>()
    })

    describe('works with useQuery', () => {
      it('without initial data', () => {
        const query = useQuery(utils.experimental_streamedOptions({
          select: data => ({ mapped: data }),
          throwOnError(error) {
            expectTypeOf(error).toEqualTypeOf<ErrorFromErrorMap<typeof baseErrorMap>>()
            return false
          },
        }))

        expectTypeOf(query.data).toEqualTypeOf<{ mapped: UtilsOutput } | undefined>()
        expectTypeOf(query.error).toEqualTypeOf<ErrorFromErrorMap<typeof baseErrorMap> | null>()
      })

      it('with initial data', () => {
        const query = useQuery(utils.experimental_streamedOptions({
          select: data => ({ mapped: data }),
          initialData: [{ title: 'title' }],
        }))

        expectTypeOf(query.data).toEqualTypeOf<{ mapped: UtilsOutput }>()
        expectTypeOf(query.error).toEqualTypeOf<ErrorFromErrorMap<typeof baseErrorMap> | null>()
      })
    })

    it('works with useQueries', async () => {
      const queries = useQueries({
        queries: [
          utils.experimental_streamedOptions({
            select: data => ({ mapped: data }),
          }),
          utils.experimental_streamedOptions({
            input: { search: 'search' },
            context: { batch: true },
          }),
        ],
      })

      expectTypeOf(queries[0].data).toEqualTypeOf<{ mapped: UtilsOutput } | undefined>()
      expectTypeOf(queries[1].data).toEqualTypeOf<UtilsOutput | undefined>()

      expectTypeOf(queries[0].error).toEqualTypeOf<null | ErrorFromErrorMap<typeof baseErrorMap>>()
      expectTypeOf(queries[1].error).toEqualTypeOf<null | ErrorFromErrorMap<typeof baseErrorMap>>()
    })

    it('works with useSuspenseQueries', () => {
      const queries = useSuspenseQueries({
        queries: [
          utils.experimental_streamedOptions({
            select: data => ({ mapped: data }),
          }),
          utils.experimental_streamedOptions({
            input: { search: 'search' },
            context: { batch: true },
          }),
        ],
      })

      expectTypeOf(queries[0].data).toEqualTypeOf<{ mapped: UtilsOutput }>()
      expectTypeOf(queries[1].data).toEqualTypeOf<UtilsOutput>()

      expectTypeOf(queries[0].error).toEqualTypeOf<null | ErrorFromErrorMap<typeof baseErrorMap>>()
      expectTypeOf(queries[1].error).toEqualTypeOf<null | ErrorFromErrorMap<typeof baseErrorMap>>()
    })

    it('works with fetchQuery', () => {
      expectTypeOf(
        queryClient.fetchQuery(utils.experimental_streamedOptions()),
      ).toEqualTypeOf<
        Promise<UtilsOutput>
      >()
    })
  })

  describe('.infiniteOptions', () => {
    const getNextPageParam = {} as GetNextPageParamFunction<number, UtilsOutput>
    const initialPageParam = 1

    it('can optional context', () => {
      const requiredUtils = {} as ProcedureUtils<{ batch: boolean }, 'input' | undefined, UtilsOutput, Error>

      utils.infiniteOptions({
        input: () => ({}),
        getNextPageParam,
        initialPageParam,
      })

      requiredUtils.infiniteOptions({
        context: { batch: true },
        input: () => 'input',
        getNextPageParam,
        initialPageParam,
      })

      // @ts-expect-error --- missing context
      requiredUtils.infiniteOptions({
        input: () => 'input',
        getNextPageParam,
        initialPageParam,
      })
    })

    it('infer correct input & pageParam type', () => {
      utils.infiniteOptions({
        input: (pageParam) => {
          expectTypeOf(pageParam).toEqualTypeOf<number>()
          return { cursor: pageParam }
        },
        getNextPageParam,
        initialPageParam,
      })

      utils.infiniteOptions({
        input: (cursor: number | undefined) => {
          return { cursor }
        },
        getNextPageParam: lastPage => 1,
        initialPageParam: undefined,
      })

      utils.infiniteOptions({
        input: condition
          ? skipToken
          : (cursor: number | undefined) => {
              return { cursor }
            },
        getNextPageParam,
        initialPageParam,
      })

      utils.infiniteOptions({
        // @ts-expect-error invalid input
        input: (pageParam) => {
          expectTypeOf(pageParam).toEqualTypeOf<number>()

          return 'invalid'
        },
        getNextPageParam,
        initialPageParam,
      })

      utils.infiniteOptions({
        // @ts-expect-error invalid input
        input: condition
          ? skipToken
          : (cursor) => {
              return 'invalid'
            },
        getNextPageParam,
        initialPageParam,
      })

      utils.infiniteOptions({
        // @ts-expect-error conflict types
        input: condition
          ? skipToken
          : (cursor: number) => {
              return { cursor }
            },
        // @ts-expect-error conflict types
        getNextPageParam,
        // @ts-expect-error conflict types
        initialPageParam: undefined,
      })
    })

    it('infer correct context type', () => {
      utils.infiniteOptions({
        context: { batch: true },
        input: () => ({}),
        getNextPageParam,
        initialPageParam,
      })

      utils.infiniteOptions({
        // @ts-expect-error invalid context
        context: { batch: 'invalid' },
        input: () => ({}),
        getNextPageParam,
        initialPageParam,
      })
    })

    describe('works with useInfiniteQuery', () => {
      it('without initial data', () => {
        const query = useInfiniteQuery(utils.infiniteOptions({
          input: () => ({}),
          getNextPageParam,
          initialPageParam,
          select: data => ({ mapped: data }),
          throwOnError(error) {
            expectTypeOf(error).toEqualTypeOf<ErrorFromErrorMap<typeof baseErrorMap>>()
            return false
          },
        }))

        expectTypeOf(query.data).toEqualTypeOf<{ mapped: InfiniteData<UtilsOutput, number> } | undefined>()
        expectTypeOf(query.error).toEqualTypeOf<ErrorFromErrorMap<typeof baseErrorMap> | null>()
      })

      it('with initial data', () => {
        const query = useInfiniteQuery(utils.infiniteOptions({
          input: () => ({}),
          getNextPageParam,
          initialPageParam,
          select: data => ({ mapped: data }),
          initialData: { pageParams: [1], pages: [[{ title: 'title' }]] },
        }))

        expectTypeOf(query.data).toEqualTypeOf<{ mapped: InfiniteData<UtilsOutput, number> }>()
        expectTypeOf(query.error).toEqualTypeOf<ErrorFromErrorMap<typeof baseErrorMap> | null>()
      })
    })

    it('works with useSuspenseInfiniteQuery', () => {
      const query = useSuspenseInfiniteQuery(utils.infiniteOptions({
        input: () => ({}),
        getNextPageParam,
        initialPageParam,
        select: data => ({ mapped: data }),
        retry(failureCount, error) {
          expectTypeOf(error).toEqualTypeOf<ErrorFromErrorMap<typeof baseErrorMap>>()
          return false
        },
      }))

      expectTypeOf(query.data).toEqualTypeOf<{ mapped: InfiniteData<UtilsOutput, number> }>()
      expectTypeOf(query.error).toEqualTypeOf<ErrorFromErrorMap<typeof baseErrorMap> | null>()
    })

    it('works with fetchInfiniteQuery', () => {
      expectTypeOf(
        queryClient.fetchInfiniteQuery(utils.infiniteOptions({
          input: () => ({}),
          getNextPageParam,
          initialPageParam,
        })),
      ).toEqualTypeOf<
        Promise<InfiniteData<UtilsOutput, number>>
      >()
    })
  })

  describe('.mutationOptions', () => {
    it('can optional options', () => {
      const requiredUtils = {} as ProcedureUtils<{ batch: boolean }, 'input', UtilsOutput, Error>

      utils.mutationOptions()
      utils.mutationOptions({})

      requiredUtils.mutationOptions({
        context: { batch: true },
      })
      // @ts-expect-error context is required
      requiredUtils.mutationOptions()
      // @ts-expect-error context is required
      requiredUtils.mutationOptions({})
    })

    it('infer correct context type', () => {
      utils.mutationOptions({ context: { batch: true } })
      // @ts-expect-error invalid context
      utils.mutationOptions({ context: { batch: 'invalid' } })
    })

    it('works with useMutation', () => {
      const mutation = useMutation(utils.mutationOptions({
        onSuccess: (data, input) => {
          expectTypeOf(data).toEqualTypeOf<UtilsOutput>()
          expectTypeOf(input).toEqualTypeOf<UtilsInput>()
        },
        onError: (error) => {
          expectTypeOf(error).toEqualTypeOf<ErrorFromErrorMap<typeof baseErrorMap>>()
        },
      }))

      expectTypeOf<Parameters<typeof mutation.mutate>[0]>().toEqualTypeOf<UtilsInput>()
      expectTypeOf(mutation.data).toEqualTypeOf<UtilsOutput | undefined>()
      expectTypeOf(mutation.error).toEqualTypeOf<ErrorFromErrorMap<typeof baseErrorMap> | null>()
    })

    it('infer correct mutation context type', () => {
      useMutation({
        ...utils.mutationOptions({
          onMutate: v => ({ mutationContext: true }),
          onError: (e, v, context) => {
            expectTypeOf(context?.mutationContext).toEqualTypeOf<undefined | boolean>()
          },
        }),
        onSettled: (d, e, v, context) => {
          expectTypeOf(context?.mutationContext).toEqualTypeOf<undefined | boolean>()
        },
      })
    })
  })
})
