import { ref } from 'vue'
import * as keyModule from './key'
import { createProcedureUtils } from './procedure-utils'

const buildKeySpy = vi.spyOn(keyModule, 'buildKey')

const controller = new AbortController()
const signal = controller.signal

beforeEach(() => {
  vi.clearAllMocks()
})

it('.call', () => {
  const client = vi.fn(
    (...[input]) => Promise.resolve(input?.toString()),
  )
  const utils = createProcedureUtils(client, { path: ['ping'] })

  expect(utils.call).toBe(client)
})

describe('queryOptions', () => {
  const client = vi.fn(
    (...[input]) => Promise.resolve(input?.toString()),
  )
  const utils = createProcedureUtils(client, { path: ['ping'] })

  beforeEach(() => {
    client.mockClear()
  })

  it('works', async () => {
    const options = utils.queryOptions({ input: 1 }) as any

    expect(options.key.value).toBe(buildKeySpy.mock.results[0]!.value)
    expect(buildKeySpy).toHaveBeenCalledTimes(1)
    expect(buildKeySpy).toHaveBeenCalledWith(['ping'], { input: 1, type: 'query' })

    client.mockResolvedValueOnce('__mocked__')
    await expect((options as any).query({ signal })).resolves.toEqual('__mocked__')
    expect(client).toHaveBeenCalledTimes(1)
    expect(client).toBeCalledWith(1, { signal })
  })

  it('works with ref', async () => {
    const input = ref(1)
    const options = utils.queryOptions({ input }) as any

    expect(options.key.value).toBe(buildKeySpy.mock.results[0]!.value)
    expect(buildKeySpy).toHaveBeenCalledTimes(1)
    expect(buildKeySpy).toHaveBeenCalledWith(['ping'], { input: 1, type: 'query' })

    client.mockResolvedValueOnce('__mocked__')
    await expect((options as any).query({ signal })).resolves.toEqual('__mocked__')
    expect(client).toHaveBeenCalledTimes(1)
    expect(client).toBeCalledWith(1, { signal })
  })

  it('works with client context', async () => {
    const client = vi.fn((...[input]) => Promise.resolve(input?.toString()))
    const utils = createProcedureUtils(client, { path: ['ping'] })

    const options = utils.queryOptions({ context: ref({ batch: true }) }) as any

    expect(options.key.value).toBe(buildKeySpy.mock.results[0]!.value)
    expect(buildKeySpy).toHaveBeenCalledTimes(1)
    expect(buildKeySpy).toHaveBeenCalledWith(['ping'], { type: 'query' })

    client.mockResolvedValueOnce('__mocked__')
    await expect((options as any).query({ signal })).resolves.toEqual('__mocked__')
    expect(client).toHaveBeenCalledTimes(1)
    expect(client).toBeCalledWith(undefined, { signal, context: { batch: true } })
  })
})

describe('mutationOptions', () => {
  const client = vi.fn(
    (...[input]) => Promise.resolve(input?.toString()),
  )
  const utils = createProcedureUtils(client, { path: ['ping'] })

  beforeEach(() => {
    client.mockClear()
  })

  it('works', async () => {
    const options = utils.mutationOptions() as any

    expect(options.key('__input__')).toBe(buildKeySpy.mock.results[0]!.value)
    expect(buildKeySpy).toHaveBeenCalledTimes(1)
    expect(buildKeySpy).toHaveBeenCalledWith(['ping'], { input: '__input__', type: 'mutation' })

    client.mockResolvedValueOnce('__mocked__')
    await expect(options.mutation(1)).resolves.toEqual('__mocked__')
    expect(client).toHaveBeenCalledTimes(1)
    expect(client).toBeCalledWith(1, {})
  })

  it('works with client context', async () => {
    const client = vi.fn(
      (...[input]) => Promise.resolve(input?.toString()),
    )
    const utils = createProcedureUtils(client, { path: ['ping'] })

    const options = utils.mutationOptions({ context: ref({ batch: true }) }) as any

    expect(options.key('__input__')).toBe(buildKeySpy.mock.results[0]!.value)
    expect(buildKeySpy).toHaveBeenCalledTimes(1)
    expect(buildKeySpy).toHaveBeenCalledWith(['ping'], { input: '__input__', type: 'mutation' })

    client.mockResolvedValueOnce('__mocked__')
    await expect(options.mutation(1)).resolves.toEqual('__mocked__')
    expect(client).toHaveBeenCalledTimes(1)
    expect(client).toBeCalledWith(1, { context: { batch: true } })
  })
})
