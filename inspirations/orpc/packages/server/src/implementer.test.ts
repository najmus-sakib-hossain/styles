import { router as contract } from '../../contract/tests/shared'
import { router } from '../tests/shared'
import { Builder } from './builder'
import { implement } from './implementer'
import { isLazy, unlazy } from './lazy'
import * as MiddlewareDecorated from './middleware-decorated'
import * as RouterHiddenModule from './router-hidden'
import * as RouterUtilsModule from './router-utils'

const setHiddenRouterContractSpy = vi.spyOn(RouterHiddenModule, 'setHiddenRouterContract')
const decorateMiddlewareSpy = vi.spyOn(MiddlewareDecorated, 'decorateMiddleware')
const enhanceRouterSpy = vi.spyOn(RouterUtilsModule, 'enhanceRouter')

beforeEach(() => {
  vi.clearAllMocks()
})

describe('implement', () => {
  const rawImplementer = implement(contract)

  const mid = vi.fn()
  const config = {
    initialInputValidationIndex: Number.POSITIVE_INFINITY,
  }

  const implementer = rawImplementer.$config(config).use(mid)

  describe('root level', () => {
    it('.$context', () => {
      const applied = rawImplementer.$context<{ anything: string }>()

      expect(applied).toBe(rawImplementer)
    })

    it('.$config', () => {
      const config = {
        initialInputValidationIndex: Number.NEGATIVE_INFINITY,
        dedupeLeadingMiddlewares: false,
      }
      const applied = rawImplementer.$config(config)

      expect(applied.nested.ping['~orpc'].config).toBe(config)
    })
  })

  describe('router level', () => {
    it('.middleware', () => {
      const mid = vi.fn()
      const applied = rawImplementer.nested.middleware(mid)
      expect(applied).toBe(decorateMiddlewareSpy.mock.results[0]?.value)
      expect(decorateMiddlewareSpy).toHaveBeenCalledOnce()
      expect(decorateMiddlewareSpy).toHaveBeenCalledWith(mid)
    })

    it('.use', () => {
      const mid = vi.fn()
      const applied = rawImplementer.nested.use(mid)

      expect(applied.ping['~orpc'].middlewares).toEqual([mid])
    })

    it('.router', () => {
      const applied = implementer.nested.router(router as any)

      expect(RouterHiddenModule.getHiddenRouterContract(applied)).toBe(contract.nested)
      expect(applied).toBe(setHiddenRouterContractSpy.mock.results[0]?.value)

      expect(setHiddenRouterContractSpy).toHaveBeenCalledOnce()
      expect(setHiddenRouterContractSpy).toHaveBeenCalledWith(enhanceRouterSpy.mock.results[0]?.value, contract.nested)

      expect(enhanceRouterSpy).toHaveBeenCalledOnce()
      expect(enhanceRouterSpy).toHaveBeenCalledWith(router, {
        middlewares: [mid],
        errorMap: {},
        dedupeLeadingMiddlewares: true,
      })
    })

    it('.lazy', () => {
      const applied = implementer.nested.lazy(() => Promise.resolve({ default: router as any }))

      expect(RouterHiddenModule.getHiddenRouterContract(applied)).toBe(contract.nested)
      expect(applied).toBe(setHiddenRouterContractSpy.mock.results[0]?.value)

      expect(setHiddenRouterContractSpy).toHaveBeenCalledOnce()
      expect(setHiddenRouterContractSpy).toHaveBeenCalledWith(enhanceRouterSpy.mock.results[0]?.value, contract.nested)

      expect(enhanceRouterSpy).toHaveBeenCalledOnce()
      expect(enhanceRouterSpy).toHaveBeenCalledWith(expect.any(Object), {
        middlewares: [mid],
        errorMap: {},
        dedupeLeadingMiddlewares: true,
      })

      const lazied = enhanceRouterSpy.mock.calls[0]?.[0]

      expect(lazied).toSatisfy(isLazy)
      expect(unlazy(lazied)).resolves.toEqual({ default: router })
    })
  })

  it('each procedure is a ProcedureImplementer', () => {
    const pingBuilder = (builder: any) => {
      expect(builder).toBeInstanceOf(Builder)
      expect(builder['~orpc']).toEqual({
        ...contract.ping['~orpc'],
        config,
        middlewares: [mid],
        inputValidationIndex: Number.POSITIVE_INFINITY,
        outputValidationIndex: 1,
        dedupeLeadingMiddlewares: true,
      })

      return true
    }

    const pongBuilder = (builder: any) => {
      expect(builder).toBeInstanceOf(Builder)
      expect(builder['~orpc']).toEqual({
        ...contract.pong['~orpc'],
        config,
        middlewares: [mid],
        inputValidationIndex: Number.POSITIVE_INFINITY,
        outputValidationIndex: 1,
        dedupeLeadingMiddlewares: true,
      })

      return true
    }

    expect(implementer.ping).toSatisfy(pingBuilder)
    expect(implementer.nested.ping).toSatisfy(pingBuilder)

    expect(implementer.pong).toSatisfy(pongBuilder)
    expect(implementer.nested.pong).toSatisfy(pongBuilder)
  })

  it('contract & method has the same name', () => {
    const conflictedContract = {
      $context: {
        $context: contract,
      },
      use: {
        use: contract,
      },
    }

    const implementer = implement(conflictedContract)

    expect(implementer.$context.$context.nested.ping).toBeInstanceOf(Builder)
    expect(implementer.use.use.nested.ping).toBeInstanceOf(Builder)
  })

  it('not recursive if access with a symbol', () => {
    expect((implementer as any)[Symbol.for('test')]).toBeUndefined()
    expect((implementer.nested as any)[Symbol.for('test')]).toBeUndefined()
    expect((implementer.nested.ping as any)[Symbol.for('test')]).toBeUndefined()
    expect((implementer.use as any)[Symbol.for('test')]).toBeUndefined()
  })
})
