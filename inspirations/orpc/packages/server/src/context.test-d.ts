import type { MergedCurrentContext, MergedInitialContext } from './context'

it('MergedInitialContext', () => {
  expectTypeOf<MergedInitialContext<{ a: string }, { b: number }, { c: string }>>().toMatchTypeOf<{ a: string, b: number }>()
  expectTypeOf<MergedInitialContext<{ a: string }, { a: number }, { c: string }>>().toMatchTypeOf<{ a: never }>()
  expectTypeOf<MergedInitialContext<{ a: string }, { c: number }, { c: string }>>().toMatchTypeOf<{ a: string }>()
})

it('MergedCurrentContext', () => {
  expectTypeOf<MergedCurrentContext<{ a: string }, { b: number }>>().toMatchTypeOf<{ a: string, b: number }>()
  expectTypeOf<MergedCurrentContext<{ a: string }, { a: number }>>().toMatchTypeOf<{ a: number }>()
})
