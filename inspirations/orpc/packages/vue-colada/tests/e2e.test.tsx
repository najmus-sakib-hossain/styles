import { isDefinedError, ORPCError } from '@orpc/client'
import { useMutation, useQuery, useQueryCache } from '@pinia/colada'
import { computed, defineComponent, ref } from 'vue'
import { pingHandler } from '../../server/tests/shared'
import { mount, orpc } from './shared'

beforeEach(() => {
  vi.clearAllMocks()
})

it('case: call directly', async () => {
  expect(await orpc.ping.call({ input: 123 })).toEqual({ output: '123' })
})

it('case: with useQuery', async () => {
  const mounted = mount(defineComponent({
    setup() {
      const id = ref(123)

      const queryCache = useQueryCache()
      const query = useQuery(orpc.nested.ping.queryOptions({ input: computed(() => ({ input: id.value })) }))

      const setId = (value: number) => {
        id.value = value
      }

      return { query, queryCache, setId }
    },
    template: '',
  }))

  // I don't know why but whe should put error case in the top of the test or it will fail by `Unhandled Rejection`
  pingHandler.mockRejectedValueOnce(new ORPCError('OVERRIDE'))
  await vi.waitFor(
    () => expect(mounted.vm.query.error.value).toSatisfy((e: any) => isDefinedError(e) && e.code === 'OVERRIDE'),
  )

  pingHandler.mockReset()

  mounted.vm.queryCache.invalidateQueries({ key: orpc.ping.key() })
  expect(mounted.vm.query.isLoading.value).toEqual(false)

  mounted.vm.queryCache.invalidateQueries({ key: orpc.nested.pong.key() })
  expect(mounted.vm.query.isLoading.value).toEqual(false)

  mounted.vm.queryCache.invalidateQueries({ key: orpc.nested.key() })
  expect(mounted.vm.query.isLoading.value).toEqual(true)

  await vi.waitFor(() => expect(mounted.vm.query.data.value).toEqual({ output: '123' }))

  expect(
    mounted.vm.queryCache.getQueryData(orpc.nested.ping.key({ type: 'query', input: { input: 123 } })),
  ).toEqual({ output: '123' })

  mounted.vm.setId(456)

  await vi.waitFor(() => expect(mounted.vm.query.data.value).toEqual({ output: '456' }))
})

it('case: with useMutation', async () => {
  const mounted = mount(defineComponent({
    setup() {
      const mutation = useMutation(orpc.nested.ping.mutationOptions())

      return { mutation }
    },
    template: '',
  }))

  mounted.vm.mutation.mutate({ input: 123 })

  await vi.waitFor(() => expect(mounted.vm.mutation.data.value).toEqual({ output: '123' }))

  pingHandler.mockRejectedValueOnce(new ORPCError('OVERRIDE'))

  mounted.vm.mutation.mutate({ input: 456 })

  await vi.waitFor(() => {
    expect((mounted.vm.mutation as any).error.value).toBeInstanceOf(ORPCError)
    expect((mounted.vm.mutation as any).error.value).toSatisfy(isDefinedError)
    expect((mounted.vm.mutation as any).error.value.code).toEqual('OVERRIDE')
  })
})
