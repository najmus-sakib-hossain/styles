import type { IntersectPick, PromiseWithError, SetOptional } from './types'

it('SetOptional', () => {
  expectTypeOf<SetOptional<{ a: number }, 'a'>>().toMatchTypeOf<{ a?: number }>()
  expectTypeOf<SetOptional<{ a?: number }, 'a'>>().toMatchTypeOf<{ a?: number }>()
})

interface Empty {}

it('IntersectPick', () => {
  expectTypeOf<IntersectPick<{ a: number }, { a: number, b: number }>>().toEqualTypeOf<{ a: number }>()
  expectTypeOf<IntersectPick<{ a: number, b: number }, { b: number }>>().toEqualTypeOf<{ b: number }>()
  expectTypeOf<IntersectPick<{ a: number }, { b: number }>>().toEqualTypeOf<Empty>()
})

it('PromiseWithError', () => {
  type C = PromiseWithError<number | undefined | null, Error | undefined | null>

  expectTypeOf<C extends Promise<infer T> ? T : never>().toEqualTypeOf<number | undefined | null>()
  expectTypeOf<C extends PromiseWithError<infer T, infer E> ? [T, E] : never>().toEqualTypeOf<[number | undefined | null, Error | undefined | null]>()
})
