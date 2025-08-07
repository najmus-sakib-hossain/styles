import type { Context } from '../../server/src/context'
import type { MiddlewareNextFn, MiddlewareResult } from '../../server/src/middleware'
import type { Interceptor } from './interceptor'
import type { PromiseWithError } from './types'
import { os } from '../../server/src/builder'
import { onError, onFinish, onStart, onSuccess } from './interceptor'

it('onStart', () => {
  const interceptor: Interceptor<{ foo: string }, PromiseWithError<'success', 'error'>> = onStart((options) => {
    expectTypeOf(options.foo).toEqualTypeOf<string>()
    expectTypeOf(options.next).toBeCallableWith<[options?: { foo: string }]>()
    expectTypeOf(options.next()).toEqualTypeOf<PromiseWithError<'success', 'error'>>()
  })

  os.$context<{ something: string }>().use(onStart(({ context, next }) => {
    expectTypeOf(context).toEqualTypeOf<{ something: string }>()
    expectTypeOf(next).toEqualTypeOf<MiddlewareNextFn<unknown>>()
  })).handler(({ context }) => {
    expectTypeOf(context).toMatchTypeOf<{ something: string }>()
  })
})

it('onSuccess', () => {
  const interceptor: Interceptor<{ foo: string }, PromiseWithError<'success', 'error'>> = onSuccess((result, options) => {
    expectTypeOf(result).toEqualTypeOf<'success'>()

    expectTypeOf(options.foo).toEqualTypeOf<string>()
    expectTypeOf(options.next).toBeCallableWith<[options?: { foo: string }]>()
    expectTypeOf(options.next()).toEqualTypeOf<PromiseWithError<'success', 'error'>>()
  })

  os.$context<{ something: string }>().use(onSuccess((data, { context, next }) => {
    expectTypeOf(data).toEqualTypeOf <Awaited<MiddlewareResult<Context, unknown>>>()
    expectTypeOf(context).toEqualTypeOf<{ something: string }>()
    expectTypeOf(next).toEqualTypeOf<MiddlewareNextFn<unknown>>()
  })).handler(({ context }) => {
    expectTypeOf(context).toMatchTypeOf<{ something: string }>()
  })
})

it('onError', () => {
  const interceptor: Interceptor<{ foo: string }, PromiseWithError<'success', 'error'>> = onError((error, options) => {
    expectTypeOf(error).toEqualTypeOf<'error'>()

    expectTypeOf(options.foo).toEqualTypeOf<string>()
    expectTypeOf(options.next).toBeCallableWith<[options?: { foo: string }]>()
    expectTypeOf(options.next()).toEqualTypeOf<PromiseWithError<'success', 'error'>>()
  })

  os.$context<{ something: string }>().use(onError((error, { context, next }) => {
    expectTypeOf(error).toEqualTypeOf<Error>()
    expectTypeOf(context).toEqualTypeOf<{ something: string }>()
    expectTypeOf(next).toEqualTypeOf<MiddlewareNextFn<unknown>>()
  })).handler(({ context }) => {
    expectTypeOf(context).toMatchTypeOf<{ something: string }>()
  })
})

it('onFinish', () => {
  const interceptor: Interceptor<{ foo: string }, PromiseWithError<'success', 'error'>> = onFinish(([error, data, isSuccess], options) => {
    if (error || !isSuccess) {
      expectTypeOf(error).toEqualTypeOf<'error'>()
      expectTypeOf(data).toEqualTypeOf<undefined>()
    }
    else {
      expectTypeOf(error).toEqualTypeOf<null>()
      expectTypeOf(data).toEqualTypeOf<'success'>()
    }

    expectTypeOf(options.foo).toEqualTypeOf<string>()
    expectTypeOf(options.next).toBeCallableWith<[options?: { foo: string }]>()
    expectTypeOf(options.next()).toEqualTypeOf<PromiseWithError<'success', 'error'>>()
  })

  os.$context<{ something: string }>().use(onFinish(() => { }))

  os.$context<{ something: string }>().use(onFinish(([error, data, isSuccess], { context, next }) => {
    if (error || !isSuccess) {
      expectTypeOf(error).toEqualTypeOf<Error>()
      expectTypeOf(data).toEqualTypeOf<undefined>()
    }
    else {
      expectTypeOf(error).toEqualTypeOf<null>()
      expectTypeOf(data).toEqualTypeOf<Awaited<MiddlewareResult<Context, unknown>>>()
    }

    expectTypeOf(context).toEqualTypeOf<{ something: string }>()
    expectTypeOf(next).toEqualTypeOf<MiddlewareNextFn<unknown>>()
  })).handler(({ context }) => {
    expectTypeOf(context).toMatchTypeOf<{ something: string }>()
  })
})
