import { ORPCError } from '@orpc/client'
import * as z from 'zod'
import { createORPCErrorConstructorMap, validateORPCError } from './error'
import { isLazy, lazy, unlazy } from './lazy'
import { Procedure } from './procedure'
import { createProcedureClient } from './procedure-client'

vi.mock('./error', async origin => ({
  ...await origin(),
  validateORPCError: vi.fn((map, error) => error),
  createORPCErrorConstructorMap: vi.fn(),
}))

// this transform ensure workflow is correct preMiddlewares <-> validation <-> postMiddlewares <-> handler
const schema = z.object({ val: z.string().transform(v => Number(v)) })

const handler = vi.fn(() => ({ val: '123' }))
const preMid1 = vi.fn(({ next }, input, output) => next({}))
const preMid2 = vi.fn(({ next }, input, output) => next({}))

const postMid1 = vi.fn(({ next }, input, output) => next({}))
const postMid2 = vi.fn(({ next }, input, output) => next({}))

const baseErrors = {
  BAD_REQUEST: {
    data: z.object({ why: z.string().transform(v => Number(v)) }),
  },
}

const procedure = new Procedure({
  inputSchema: schema,
  outputSchema: schema,
  errorMap: baseErrors,
  route: {},
  handler,
  middlewares: [preMid1, preMid2, postMid1, postMid2],
  inputValidationIndex: 2,
  outputValidationIndex: 2,
  meta: {},
})

const procedureCases = [
  ['without lazy', procedure],
  ['with lazy', lazy(() => Promise.resolve({ default: procedure }))],
] as const

beforeEach(() => {
  vi.resetAllMocks()
})

describe.each(procedureCases)('createProcedureClient - case %s', async (_, procedure) => {
  const unwrappedProcedure = isLazy(procedure) ? (await unlazy(procedure)).default : procedure

  it('just a client', async () => {
    const client = createProcedureClient(procedure)

    vi.mocked(createORPCErrorConstructorMap).mockReturnValueOnce('__constructors__' as any)

    await expect(client({ val: '123' })).resolves.toEqual({ val: 123 })

    expect(createORPCErrorConstructorMap).toBeCalledTimes(1)
    expect(createORPCErrorConstructorMap).toBeCalledWith(baseErrors)

    expect(handler).toBeCalledTimes(1)
    expect(handler).toBeCalledWith({
      input: { val: 123 },
      context: {},
      path: [],
      procedure: unwrappedProcedure,
      errors: '__constructors__',
    })

    expect(preMid1).toBeCalledTimes(1)
    expect(preMid1).toBeCalledWith(expect.objectContaining({
      path: [],
      procedure: unwrappedProcedure,
      next: expect.any(Function),
      context: {},
      errors: '__constructors__',
    }), { val: '123' }, expect.any(Function))

    expect(preMid2).toBeCalledTimes(1)
    expect(preMid2).toBeCalledWith(expect.objectContaining({
      path: [],
      procedure: unwrappedProcedure,
      next: expect.any(Function),
      context: {},
      errors: '__constructors__',
    }), { val: '123' }, expect.any(Function))

    expect(postMid1).toBeCalledTimes(1)
    expect(postMid1).toBeCalledWith(expect.objectContaining({
      path: [],
      procedure: unwrappedProcedure,
      next: expect.any(Function),
      context: {},
      errors: '__constructors__',
    }), { val: 123 }, expect.any(Function))

    expect(postMid2).toBeCalledTimes(1)
    expect(postMid2).toBeCalledWith(expect.objectContaining({
      path: [],
      procedure: unwrappedProcedure,
      next: expect.any(Function),
      context: {},
      errors: '__constructors__',
    }), { val: 123 }, expect.any(Function))
  })

  it('validate input and output', async () => {
    const client = createProcedureClient(procedure)

    // @ts-expect-error - invalid input
    expect(client({ val: 123 })).rejects.toThrow('Input validation failed')

    // @ts-expect-error - invalid output
    handler.mockReturnValueOnce({ val: 1234 })
    expect(client({ val: '1234' })).rejects.toThrow('Output validation failed')

    postMid1.mockReturnValueOnce({ output: { val: 1234 } })
    expect(client({ val: '1234' })).rejects.toThrow('Output validation failed')
  })

  it('middleware can return output directly', async () => {
    const client = createProcedureClient(procedure)

    preMid1.mockReturnValueOnce({ output: { val: 990 } })
    await expect(client({ val: '123' })).resolves.toEqual({ val: 990 })
    expect(preMid1).toBeCalledTimes(1)
    expect(preMid2).toBeCalledTimes(0)
    expect(postMid1).toBeCalledTimes(0)
    expect(postMid2).toBeCalledTimes(0)
    expect(handler).toBeCalledTimes(0)

    vi.clearAllMocks()
    preMid2.mockReturnValueOnce({ output: { val: 9900 } })
    await expect(client({ val: '123' })).resolves.toEqual({ val: 9900 })
    expect(preMid1).toBeCalledTimes(1)
    expect(preMid2).toBeCalledTimes(1)
    expect(postMid1).toBeCalledTimes(0)
    expect(postMid2).toBeCalledTimes(0)
    expect(handler).toBeCalledTimes(0)
    expect(preMid1).toReturnWith(Promise.resolve({ output: { val: '9900' }, context: {} }))

    vi.clearAllMocks()
    postMid1.mockReturnValueOnce({ output: { val: '9900' } })
    await expect(client({ val: '123' })).resolves.toEqual({ val: 9900 })
    expect(preMid1).toBeCalledTimes(1)
    expect(preMid2).toBeCalledTimes(1)
    expect(postMid1).toBeCalledTimes(1)
    expect(postMid2).toBeCalledTimes(0)
    expect(handler).toBeCalledTimes(0)
    expect(preMid1).toReturnWith(Promise.resolve({ output: { val: 9900 }, context: {} }))
    expect(preMid2).toReturnWith(Promise.resolve({ output: { val: 9900 }, context: {} }))

    vi.clearAllMocks()
    postMid2.mockReturnValueOnce({ output: { val: '9900' } })
    await expect(client({ val: '123' })).resolves.toEqual({ val: 9900 })
    expect(preMid1).toBeCalledTimes(1)
    expect(preMid2).toBeCalledTimes(1)
    expect(postMid1).toBeCalledTimes(1)
    expect(postMid2).toBeCalledTimes(1)
    expect(handler).toBeCalledTimes(0)
    expect(preMid1).toReturnWith(Promise.resolve({ output: { val: 9900 }, context: {} }))
    expect(preMid2).toReturnWith(Promise.resolve({ output: { val: 9900 }, context: {} }))
    expect(postMid1).toReturnWith(Promise.resolve({ output: { val: '9900' }, context: {} }))
  })

  it('middleware can add extra context', async () => {
    const client = createProcedureClient(procedure)

    preMid1.mockImplementationOnce(({ next }) => {
      return next({
        context: {
          extra1: '__extra1__',
        },
      })
    })

    preMid2.mockImplementationOnce(({ next }) => {
      return next()
    })

    postMid1.mockImplementationOnce(({ next }) => {
      return next({
        context: {
          extra2: '__extra2__',
        },
      })
    })

    postMid2.mockImplementationOnce(({ next }) => {
      return next({
        context: {
          extra3: '__extra3__',
        },
      })
    })

    await expect(client({ val: '123' })).resolves.toEqual({ val: 123 })

    expect(preMid1).toBeCalledTimes(1)
    expect(preMid1).toHaveBeenCalledWith(expect.objectContaining({ context: {} }), expect.any(Object), expect.any(Function))
    expect(await preMid1.mock.results[0]!.value).toEqual({ output: { val: 123 }, context: { extra1: '__extra1__' } })

    expect(preMid2).toBeCalledTimes(1)
    expect(preMid2).toHaveBeenCalledWith(expect.objectContaining({
      context: { extra1: '__extra1__' },
    }), expect.any(Object), expect.any(Function))
    expect(await preMid2.mock.results[0]!.value).toEqual({ output: { val: 123 }, context: { } })

    expect(postMid1).toBeCalledTimes(1)
    expect(postMid1).toHaveBeenCalledWith(expect.objectContaining({
      context: {
        extra1: '__extra1__',
      },
    }), expect.any(Object), expect.any(Function))
    expect(await postMid1.mock.results[0]!.value).toEqual({ output: { val: '123' }, context: { extra2: '__extra2__' } })

    expect(postMid2).toBeCalledTimes(1)
    expect(postMid2).toHaveBeenCalledWith(expect.objectContaining({
      context: {
        extra1: '__extra1__',
        extra2: '__extra2__',
      },
    }), expect.any(Object), expect.any(Function))
    expect(await postMid2.mock.results[0]!.value).toEqual({ output: { val: '123' }, context: { extra3: '__extra3__' } })

    expect(handler).toBeCalledTimes(1)
    expect(handler).toHaveBeenCalledWith(expect.objectContaining({ context: {
      extra1: '__extra1__',
      extra2: '__extra2__',
      extra3: '__extra3__',
    } }))
    expect(await handler.mock.results[0]!.value).toEqual({ val: '123' })
  })

  it('middleware can override context', async () => {
    const client = createProcedureClient(procedure, {
      context: { userId: '123' },
    })

    preMid1.mockImplementationOnce(({ next }) => {
      return next({
        context: {
          userId: '__override1__',
        },
      })
    })

    preMid2.mockImplementationOnce(({ next }) => {
      return next({
        context: {
          userId: '__override2__',
        },
      })
    })

    postMid1.mockImplementationOnce(({ next }) => {
      return next({
        context: {
          userId: '__override3__',
        },
      })
    })

    postMid2.mockImplementationOnce(({ next }) => {
      return next({
        context: {
          userId: '__override4__',
        },
      })
    })

    await expect(client({ val: '123' })).resolves.toEqual({ val: 123 })

    expect(preMid1).toBeCalledTimes(1)
    expect(preMid1).toHaveBeenCalledWith(expect.objectContaining({
      context: expect.objectContaining({ userId: '123' }),
    }), expect.any(Object), expect.any(Function))
    expect(await preMid1.mock.results[0]!.value).toEqual({ output: { val: 123 }, context: { userId: '__override1__' } })

    expect(preMid2).toBeCalledTimes(1)
    expect(preMid2).toHaveBeenCalledWith(expect.objectContaining({
      context: expect.objectContaining({ userId: '__override1__' }),
    }), expect.any(Object), expect.any(Function))
    expect(await preMid2.mock.results[0]!.value).toEqual({ output: { val: 123 }, context: { userId: '__override2__' } })

    expect(postMid1).toBeCalledTimes(1)
    expect(postMid1).toHaveBeenCalledWith(expect.objectContaining({
      context: expect.objectContaining({ userId: '__override2__' }),
    }), expect.any(Object), expect.any(Function))
    expect(await postMid1.mock.results[0]!.value).toEqual({ output: { val: '123' }, context: { userId: '__override3__' } })

    expect(postMid2).toBeCalledTimes(1)
    expect(postMid2).toHaveBeenCalledWith(expect.objectContaining({
      context: expect.objectContaining({ userId: '__override3__' }),
    }), expect.any(Object), expect.any(Function))
    expect(await postMid2.mock.results[0]!.value).toEqual({ output: { val: '123' }, context: { userId: '__override4__' } })

    expect(handler).toBeCalledTimes(1)
    expect(handler).toHaveBeenCalledWith(expect.objectContaining({ context: expect.objectContaining({ userId: '__override4__' }) }))
    expect(await handler.mock.results[0]!.value).toEqual({ val: '123' })
  })

  const contextCases = [
    ['directly value', { val: '__val__' }],
    ['sync function value', () => ({ val: '__val__' })],
    ['async function value', async () => ({ val: '__val__' })],
  ] as const

  it.each(contextCases)('can accept context: %s', async (_, context) => {
    const client = createProcedureClient(procedure, {
      context,
    })

    await client({ val: '123' })

    expect(preMid1).toBeCalledTimes(1)
    expect(preMid1).toBeCalledWith(
      expect.objectContaining({ context: { val: '__val__' } }),
      expect.any(Object),
      expect.any(Function),
    )

    expect(preMid2).toBeCalledTimes(1)
    expect(preMid2).toBeCalledWith(
      expect.objectContaining({ context: { val: '__val__' } }),
      expect.any(Object),
      expect.any(Function),
    )

    expect(postMid1).toBeCalledTimes(1)
    expect(postMid1).toBeCalledWith(
      expect.objectContaining({ context: { val: '__val__' } }),
      expect.any(Object),
      expect.any(Function),
    )

    expect(postMid2).toBeCalledTimes(1)
    expect(postMid2).toBeCalledWith(
      expect.objectContaining({ context: { val: '__val__' } }),
      expect.any(Object),
      expect.any(Function),
    )

    expect(handler).toBeCalledTimes(1)
    expect(handler).toBeCalledWith(expect.objectContaining({ context: { val: '__val__' } }))
  })

  it.each(contextCases)('can intercept - context: %s', async (_, context) => {
    const interceptor = vi.fn(({ next }) => next())

    const client = createProcedureClient(procedure, {
      context,
      path: ['users'],
      interceptors: [interceptor],
    })

    vi.mocked(createORPCErrorConstructorMap).mockReturnValueOnce('__constructors__' as any)

    const signal = new AbortController().signal

    await client({ val: '123' }, { signal })

    expect(interceptor).toBeCalledTimes(1)
    expect(interceptor).toHaveBeenCalledWith({
      input: { val: '123' },
      context: { val: '__val__' },
      signal,
      path: ['users'],
      errors: '__constructors__',
      procedure: unwrappedProcedure,
      next: expect.any(Function),
    })
  })

  it('accept paths', async () => {
    const client = createProcedureClient(procedure, {
      path: ['users'],
    })

    await client({ val: '123' })

    expect(preMid1).toBeCalledTimes(1)
    expect(preMid1).toHaveBeenCalledWith(expect.objectContaining({ path: ['users'] }), expect.any(Object), expect.any(Function))

    expect(preMid2).toBeCalledTimes(1)
    expect(preMid2).toHaveBeenCalledWith(expect.objectContaining({ path: ['users'] }), expect.any(Object), expect.any(Function))

    expect(handler).toBeCalledTimes(1)
    expect(handler).toHaveBeenCalledWith(expect.objectContaining({ path: ['users'] }))
  })

  it('support signal', async () => {
    const controller = new AbortController()
    const signal = controller.signal

    const client = createProcedureClient(procedure, {
      context: { userId: '123' },
    })

    await client({ val: '123' }, { signal })

    expect(preMid1).toBeCalledTimes(1)
    expect(preMid1).toHaveBeenCalledWith(expect.objectContaining({ signal }), expect.any(Object), expect.any(Function))

    expect(preMid2).toBeCalledTimes(1)
    expect(preMid2).toHaveBeenCalledWith(expect.objectContaining({ signal }), expect.any(Object), expect.any(Function))

    expect(postMid1).toBeCalledTimes(1)
    expect(postMid1).toHaveBeenCalledWith(expect.objectContaining({ signal }), expect.any(Object), expect.any(Function))

    expect(postMid2).toBeCalledTimes(1)
    expect(postMid2).toHaveBeenCalledWith(expect.objectContaining({ signal }), expect.any(Object), expect.any(Function))

    expect(handler).toBeCalledTimes(1)
    expect(handler).toHaveBeenCalledWith(expect.objectContaining({ signal }))
  })

  it('support lastEventId', async () => {
    const client = createProcedureClient(procedure, {
      context: { userId: '123' },
    })

    await client({ val: '123' }, { lastEventId: '12345' })

    expect(preMid1).toBeCalledTimes(1)
    expect(preMid1).toHaveBeenCalledWith(expect.objectContaining({ lastEventId: '12345' }), expect.any(Object), expect.any(Function))

    expect(preMid2).toBeCalledTimes(1)
    expect(preMid2).toHaveBeenCalledWith(expect.objectContaining({ lastEventId: '12345' }), expect.any(Object), expect.any(Function))

    expect(postMid1).toBeCalledTimes(1)
    expect(postMid1).toHaveBeenCalledWith(expect.objectContaining({ lastEventId: '12345' }), expect.any(Object), expect.any(Function))

    expect(postMid2).toBeCalledTimes(1)
    expect(postMid2).toHaveBeenCalledWith(expect.objectContaining({ lastEventId: '12345' }), expect.any(Object), expect.any(Function))

    expect(handler).toBeCalledTimes(1)
    expect(handler).toHaveBeenCalledWith(expect.objectContaining({ lastEventId: '12345' }))
  })

  describe('error validation', () => {
    const client = createProcedureClient(procedure)

    it('throw non-ORPC Error right away', () => {
      const e1 = new Error('non-ORPC Error')
      handler.mockRejectedValueOnce(e1)
      expect(client({ val: '123' })).rejects.toBe(e1)
    })

    it('validate ORPC Error', async () => {
      const e1 = new ORPCError('BAD_REQUEST')
      const e2 = new ORPCError('BAD_REQUEST', { defined: true })

      handler.mockRejectedValueOnce(e1)
      vi.mocked(validateORPCError).mockReturnValueOnce(Promise.resolve(e2))

      await expect(client({ val: '123' })).rejects.toBe(e2)

      expect(validateORPCError).toBeCalledTimes(1)
      expect(validateORPCError).toBeCalledWith(baseErrors, e1)
    })
  })

  it('with client context', async () => {
    const context = vi.fn()
    const client = createProcedureClient(procedure, {
      context,
    })

    await client({ val: '123' })
    expect(context).toBeCalledTimes(1)
    expect(context).toBeCalledWith({})

    context.mockClear()
    await client({ val: '123' }, { context: { cache: true } })
    expect(context).toBeCalledTimes(1)
    expect(context).toBeCalledWith({ cache: true })
  })

  it('can multiple .next calls', async () => {
    const client = createProcedureClient(procedure)

    preMid1.mockImplementationOnce(async ({ next }, input, output) => output([(await next()).output, (await next()).output, (await next()).output, (await next()).output]))

    let index = 0

    preMid2.mockImplementation(({ next }) => next({ context: { preMid2: index++ } }))
    postMid1.mockImplementation(({ next }) => next({ context: { postMid1: index++ } }))

    await expect(client({ val: '123' })).resolves.toEqual([{ val: 123 }, { val: 123 }, { val: 123 }, { val: 123 }])

    expect(preMid1).toBeCalledTimes(1)
    expect(preMid2).toBeCalledTimes(4)
    expect(postMid1).toBeCalledTimes(4)
    expect(postMid2).toBeCalledTimes(4)
    expect(handler).toBeCalledTimes(4)

    expect((handler as any).mock.calls[0][0].context.preMid2).toBe(0)
    expect((handler as any).mock.calls[0][0].context.postMid1).toBe(1)

    expect((handler as any).mock.calls[1][0].context.preMid2).toBe(2)
    expect((handler as any).mock.calls[1][0].context.postMid1).toBe(3)

    expect((handler as any).mock.calls[2][0].context.preMid2).toBe(4)
    expect((handler as any).mock.calls[2][0].context.postMid1).toBe(5)

    expect((handler as any).mock.calls[3][0].context.preMid2).toBe(6)
    expect((handler as any).mock.calls[3][0].context.postMid1).toBe(7)
  })
})

it('still work without InputSchema', async () => {
  const procedure = new Procedure({
    outputSchema: schema,
    errorMap: {},
    route: {},
    meta: {},
    handler,
    middlewares: [],
    inputValidationIndex: 0,
    outputValidationIndex: 0,
  })

  const client = createProcedureClient(procedure)

  await expect(client('anything')).resolves.toEqual({ val: 123 })

  expect(handler).toBeCalledTimes(1)
  expect(handler).toHaveBeenCalledWith({ input: 'anything', context: {}, path: [], procedure })
})

it('still work without OutputSchema', async () => {
  const procedure = new Procedure({
    inputSchema: schema,
    outputSchema: undefined,
    errorMap: {},
    route: {},
    meta: {},
    handler,
    middlewares: [],
    inputValidationIndex: 0,
    outputValidationIndex: 0,
  })

  const client = createProcedureClient(procedure)

  // @ts-expect-error - without output schema
  handler.mockReturnValueOnce('anything')

  await expect(client({ val: '123' })).resolves.toEqual('anything')

  expect(handler).toBeCalledTimes(1)
  expect(handler).toHaveBeenCalledWith({ input: { val: 123 }, context: {}, path: [], procedure })
})

it('has helper `output` in meta', async () => {
  const client = createProcedureClient(procedure)

  preMid2.mockImplementationOnce((_, __, output) => {
    return output({ val: 99990 })
  })

  await expect(client({ val: '123' })).resolves.toEqual({ val: 99990 })

  expect(preMid1).toBeCalledTimes(1)
  expect(preMid2).toBeCalledTimes(1)
  expect(handler).toBeCalledTimes(0)

  expect(preMid1).toReturnWith(Promise.resolve({ output: { val: '99990' }, context: {} }))
})
