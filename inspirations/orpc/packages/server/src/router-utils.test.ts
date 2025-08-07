import { enhanceRoute } from '@orpc/contract'
import { contract, ping, pingMiddleware, pong, router } from '../tests/shared'
import { getLazyMeta, isLazy, unlazy } from './lazy'
import { setHiddenRouterContract } from './router-hidden'
import { enhanceRouter, getRouter, resolveContractProcedures, traverseContractProcedures, unlazyRouter } from './router-utils'

it('getRouter', () => {
  expect(getRouter(router, [])).toEqual(router)
  expect(getRouter(router, ['ping'])).toEqual(router.ping)
  expect(getRouter(router, ['nested', 'pong'])).toSatisfy(isLazy)
  expect(unlazy(getRouter(router, ['nested', 'pong']))).resolves.toEqual({ default: pong })

  expect(getRouter(router, ['not-exist'])).toBeUndefined()
  expect(getRouter(router, ['nested', 'not-exist', 'not-exist'])).toSatisfy(isLazy)
  expect(unlazy(getRouter(router, ['nested', 'not-exist', 'not-exist']))).resolves.toEqual({ default: undefined })

  expect(getRouter(router, ['pong', '~orpc'])).toBeUndefined()
  expect(getRouter(router, ['ping', '~orpc'])).toSatisfy(isLazy)
  expect(unlazy(getRouter(router, ['ping', '~orpc']))).resolves.toEqual({ default: undefined })
})

describe('enhanceRouter', () => {
  it('works', async () => {
    const mid = vi.fn()
    const extraErrorMap = { EXTRA: {} }
    const options = {
      errorMap: extraErrorMap,
      middlewares: [mid, pingMiddleware],
      prefix: '/adapt',
      tags: ['adapt'],
      dedupeLeadingMiddlewares: false,
    } as const

    const enhanced = enhanceRouter(router, options)

    expect(enhanced.ping).toSatisfy(isLazy)
    expect((await unlazy(enhanced.ping)).default['~orpc'].middlewares).toEqual([mid, pingMiddleware, ...ping['~orpc'].middlewares])
    expect((await unlazy(enhanced.ping)).default['~orpc'].route).toEqual(enhanceRoute(ping['~orpc'].route, options))
    expect((await unlazy(enhanced.ping)).default['~orpc'].inputValidationIndex).toEqual(3)
    expect((await unlazy(enhanced.ping)).default['~orpc'].outputValidationIndex).toEqual(3)
    expect(getLazyMeta(enhanced.ping)).toEqual({ prefix: '/adapt' })

    expect(enhanced.pong['~orpc'].middlewares).toEqual([mid, pingMiddleware, ...pong['~orpc'].middlewares])
    expect(enhanced.pong['~orpc'].route).toEqual(enhanceRoute(pong['~orpc'].route, options))
    expect(enhanced.pong['~orpc'].inputValidationIndex).toEqual(2)
    expect(enhanced.pong['~orpc'].outputValidationIndex).toEqual(2)

    expect(enhanced.nested).toSatisfy(isLazy)
    expect(getLazyMeta(enhanced.nested)).toEqual({ prefix: '/adapt' })

    expect(enhanced.nested.ping).toSatisfy(isLazy)
    expect((await unlazy(enhanced.nested.ping)).default['~orpc'].middlewares).toEqual([mid, pingMiddleware, ...ping['~orpc'].middlewares])
    expect((await unlazy(enhanced.nested.ping)).default['~orpc'].route).toEqual(enhanceRoute(ping['~orpc'].route, options))
    expect((await unlazy(enhanced.nested.ping)).default['~orpc'].inputValidationIndex).toEqual(3)
    expect((await unlazy(enhanced.nested.ping)).default['~orpc'].outputValidationIndex).toEqual(3)
    expect(getLazyMeta(enhanced.nested.ping)).toEqual({ prefix: '/adapt' })

    expect(enhanced.nested.pong).toSatisfy(isLazy)
    expect((await unlazy(enhanced.nested.pong)).default['~orpc'].middlewares).toEqual([mid, pingMiddleware, ...pong['~orpc'].middlewares])
    expect((await unlazy(enhanced.nested.pong)).default['~orpc'].route).toEqual(enhanceRoute(pong['~orpc'].route, options))
    expect((await unlazy(enhanced.nested.pong)).default['~orpc'].inputValidationIndex).toEqual(2)
    expect((await unlazy(enhanced.nested.pong)).default['~orpc'].outputValidationIndex).toEqual(2)
    expect(getLazyMeta(enhanced.nested.pong)).toEqual({ prefix: '/adapt' })
  })

  it('can merge lazy prefix', async () => {
    const enhanced = enhanceRouter(
      enhanceRouter(router, { errorMap: {}, prefix: '/enhanced', tags: [], middlewares: [], dedupeLeadingMiddlewares: false }),
      { errorMap: {}, prefix: '/prefix', tags: [], middlewares: [], dedupeLeadingMiddlewares: false },
    )

    expect(getLazyMeta(enhanced.ping)).toEqual({ prefix: '/prefix/enhanced' })
    expect(getLazyMeta(enhanced.nested)).toEqual({ prefix: '/prefix/enhanced' })
    expect(getLazyMeta(enhanced.nested.ping)).toEqual({ prefix: '/prefix/enhanced' })
    expect(getLazyMeta(enhanced.nested.pong)).toEqual({ prefix: '/prefix/enhanced' })
  })

  it('can dedupeLeadingMiddlewares', async () => {
    const mid = vi.fn()
    const extraErrorMap = { EXTRA: {} }
    const options = {
      errorMap: extraErrorMap,
      middlewares: [pingMiddleware],
      dedupeLeadingMiddlewares: true,
    } as const

    const enhanced = enhanceRouter(router, options)

    expect(enhanced.ping).toSatisfy(isLazy)
    expect((await unlazy(enhanced.ping)).default['~orpc'].middlewares).toEqual(ping['~orpc'].middlewares)
    expect((await unlazy(enhanced.ping)).default['~orpc'].route).toEqual(ping['~orpc'].route)
    expect((await unlazy(enhanced.ping)).default['~orpc'].inputValidationIndex).toEqual(1)
    expect((await unlazy(enhanced.ping)).default['~orpc'].outputValidationIndex).toEqual(1)
  })
})

describe('traverseContractProcedures', () => {
  it('with contract', () => {
    const callback = vi.fn()

    expect(traverseContractProcedures({
      router: contract,
      path: [],
    }, callback)).toEqual([])

    expect(callback).toHaveBeenCalledTimes(4)

    expect(callback).toHaveBeenNthCalledWith(1, {
      contract: contract.ping,
      path: ['ping'],
    })

    expect(callback).toHaveBeenNthCalledWith(2, {
      contract: contract.pong,
      path: ['pong'],
    })

    expect(callback).toHaveBeenNthCalledWith(3, {
      contract: contract.nested.ping,
      path: ['nested', 'ping'],
    })

    expect(callback).toHaveBeenNthCalledWith(4, {
      contract: contract.nested.pong,
      path: ['nested', 'pong'],
    })
  })

  it('with router', () => {
    const callback = vi.fn()

    expect(traverseContractProcedures({
      router,
      path: [],
    }, callback)).toEqual([
      { path: ['ping'], router: router.ping },
      { path: ['nested'], router: router.nested },
    ])

    expect(callback).toHaveBeenCalledTimes(1)

    expect(callback).toHaveBeenNthCalledWith(1, {
      contract: router.pong,
      path: ['pong'],
    })
  })

  it('with hidden contract', () => {
    const callback = vi.fn()

    expect(traverseContractProcedures({
      router: setHiddenRouterContract(router, contract),
      path: [],
    }, callback)).toEqual([])

    expect(callback).toHaveBeenCalledTimes(4)

    expect(callback).toHaveBeenNthCalledWith(1, {
      contract: contract.ping,
      path: ['ping'],
    })

    expect(callback).toHaveBeenNthCalledWith(2, {
      contract: contract.pong,
      path: ['pong'],
    })

    expect(callback).toHaveBeenNthCalledWith(3, {
      contract: contract.nested.ping,
      path: ['nested', 'ping'],
    })

    expect(callback).toHaveBeenNthCalledWith(4, {
      contract: contract.nested.pong,
      path: ['nested', 'pong'],
    })
  })
})

it('resolveContractProcedures', async () => {
  const callback = vi.fn()

  expect(await resolveContractProcedures({
    router,
    path: [],
  }, callback)).toEqual(undefined)

  expect(callback).toHaveBeenCalledTimes(4)

  expect(callback).toHaveBeenNthCalledWith(1, {
    contract: router.pong,
    path: ['pong'],
  })

  expect(callback).toHaveBeenNthCalledWith(2, {
    contract: (await unlazy(router.ping)).default,
    path: ['ping'],
  })

  expect(callback).toHaveBeenNthCalledWith(3, {
    contract: (await unlazy(router.nested)).default.ping,
    path: ['nested', 'ping'],
  })

  expect(callback).toHaveBeenNthCalledWith(4, {
    contract: (await unlazy((await unlazy(router.nested)).default.pong)).default,
    path: ['nested', 'pong'],
  })
})

it('unlazyRouter', async () => {
  const unlazied = await unlazyRouter(router)

  expect(unlazied).toEqual({
    ping,
    pong,
    nested: {
      ping,
      pong,
    },
  })
})
