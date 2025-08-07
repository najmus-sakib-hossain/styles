import type { AnySchema, ErrorMap } from '@orpc/contract'
import type { baseErrorMap, BaseMeta } from '../../contract/tests/shared'
import type { CurrentContext } from '../tests/shared'
import type { Context } from './context'
import type { ORPCErrorConstructorMap } from './error'
import type { Middleware, MiddlewareOutputFn } from './middleware'
import type { DecoratedMiddleware } from './middleware-decorated'
import type { Procedure } from './procedure'

const decorated = {} as DecoratedMiddleware<
  CurrentContext,
  { extra: boolean },
  { input1: string, input2: string },
  { output: number },
  ORPCErrorConstructorMap<typeof baseErrorMap>,
  BaseMeta
>

describe('DecoratedMiddleware', () => {
  it('is a middleware', () => {
    expectTypeOf(decorated).toMatchTypeOf<
      Middleware<
        CurrentContext,
        { extra: boolean },
        { input1: string, input2: string },
        { output: number },
        ORPCErrorConstructorMap<typeof baseErrorMap>,
        BaseMeta
      >
    >()
  })

  it('.mapInput', () => {
    const mapped = decorated.mapInput((input: 'input') => ({ input1: input, input2: input }))

    expectTypeOf(mapped).toEqualTypeOf<
      DecoratedMiddleware<
        CurrentContext,
        { extra: boolean },
        'input',
        { output: number },
        ORPCErrorConstructorMap<typeof baseErrorMap>,
        BaseMeta
      >
    >()

    // @ts-expect-error - invalid map input return
    decorated.mapInput((input: 'input') => ({ input: 123 }))
  })

  describe('.concat', () => {
    it('without map input', () => {
      const applied = decorated.concat(({ context, next, path, procedure, errors, signal }, input: { input1: string }, output) => {
        expectTypeOf(context).toEqualTypeOf<Omit<CurrentContext, 'extra'> & { extra: boolean }>()
        expectTypeOf(path).toEqualTypeOf<readonly string[]>()
        expectTypeOf(procedure).toEqualTypeOf<
          Procedure<Context, Context, AnySchema, AnySchema, ErrorMap, BaseMeta>
        >()
        expectTypeOf(output).toEqualTypeOf<MiddlewareOutputFn<{ output: number }>>()
        expectTypeOf(errors).toEqualTypeOf<ORPCErrorConstructorMap<typeof baseErrorMap>>()
        expectTypeOf(signal).toEqualTypeOf<undefined | AbortSignal>()

        return next({
          context: {
            extra2: true,
          },
        })
      })

      expectTypeOf(applied).toEqualTypeOf<
        DecoratedMiddleware<
          CurrentContext & Record<never, never>,
          Omit<{ extra: boolean }, never> & { extra2: boolean },
          { input1: string, input2: string },
          { output: number },
          ORPCErrorConstructorMap<typeof baseErrorMap>,
          BaseMeta
        >
      >()

      // @ts-expect-error --- invalid TInContext
      decorated.concat({} as Middleware<{ auth: 'invalid' }, any, any, any, any, any>)
      // @ts-expect-error --- input is not match
      decorated.concat(({ next }, input: { invalid: string }) => next({}))
      // @ts-expect-error --- output is not match
      decorated.concat(({ next }, input, output: MiddlewareOutputFn<'invalid'>) => next({}))
      // @ts-expect-error --- conflict context
      decorated.concat(({ next }) => next({ context: { db: undefined } }))
    })

    it('with map input', () => {
      const applied = decorated.concat(({ context, next, path, procedure, errors, signal }, input: { mapped: boolean }, output) => {
        expectTypeOf(input).toEqualTypeOf<{ mapped: boolean }>()
        expectTypeOf(context).toEqualTypeOf<Omit<CurrentContext, 'extra'> & { extra: boolean }>()
        expectTypeOf(path).toEqualTypeOf<readonly string[]>()
        expectTypeOf(procedure).toEqualTypeOf<
          Procedure<Context, Context, AnySchema, AnySchema, ErrorMap, BaseMeta>
        >()
        expectTypeOf(output).toEqualTypeOf<MiddlewareOutputFn<{ output: number }>>()
        expectTypeOf(errors).toEqualTypeOf<ORPCErrorConstructorMap<typeof baseErrorMap>>()
        expectTypeOf(signal).toEqualTypeOf<undefined | AbortSignal>()

        return next({
          context: {
            extra2: true,
          },
        })
      }, (input: { input1: string }) => {
        return { mapped: true }
      })

      expectTypeOf(applied).toEqualTypeOf<
        DecoratedMiddleware<
          CurrentContext & Record<never, never>,
          Omit<{ extra: boolean }, never> & { extra2: boolean },
          { input1: string, input2: string },
          { output: number },
          ORPCErrorConstructorMap<typeof baseErrorMap>,
          BaseMeta
        >
      >()

      decorated.concat(
        ({ context, next, path, procedure, errors, signal }, input: { mapped: boolean }, output) => next(),
        // @ts-expect-error --- invalid map input
        input => ({ invalid: true }),
      )

      // @ts-expect-error --- invalid TInContext
      decorated.concat({} as Middleware<{ auth: 'invalid' }, any, any, any, any, any>, () => { })
      // @ts-expect-error --- input is not match
      decorated.concat(({ next }, input: { mapped: boolean }) => next({}), (input: { invalid: string }) => ({ mapped: true }))
      // @ts-expect-error --- output is not match
      decorated.concat(({ next }, input, output: MiddlewareOutputFn<'invalid'>) => next({}), input => ({ mapped: true }))
      // @ts-expect-error --- conflict context
      decorated.concat(({ next }) => next({ context: { db: undefined } }), () => { })
    })

    it('with TInContext', () => {
      const mid = {} as Middleware<{ cacheable?: boolean } & Record<never, never>, Record<never, never>, unknown, any, ORPCErrorConstructorMap<any>, BaseMeta>

      expectTypeOf(decorated.concat(mid)).toEqualTypeOf<
        DecoratedMiddleware<
          CurrentContext & Omit<{ cacheable?: boolean } & Record<never, never>, 'db' | 'auth' | 'extra'>,
          Omit<{ extra: boolean }, never> & Record<never, never>,
          { input1: string, input2: string },
          { output: number },
          ORPCErrorConstructorMap<typeof baseErrorMap>,
          BaseMeta
        >
      >()

      expectTypeOf(decorated.concat(mid, () => { })).toEqualTypeOf<
        DecoratedMiddleware<
          CurrentContext & Omit<{ cacheable?: boolean } & Record<never, never>, 'db' | 'auth' | 'extra'>,
          Omit<{ extra: boolean }, never> & Record<never, never>,
          { input1: string, input2: string },
          { output: number },
          ORPCErrorConstructorMap<typeof baseErrorMap>,
          BaseMeta
        >
      >()
    })
  })
})
