import type { ComputedGetter, ComputedRef, Ref } from 'vue'
import type { MaybeRefDeep } from './types'

it('MaybeDeepRef', () => {
  type Expected = MaybeRefDeep<{ nested: { val: string } }>

  expectTypeOf<{ nested: { val: string } }>().toMatchTypeOf<Expected>()
  expectTypeOf<{ nested: { val: Ref<string> } }>().toMatchTypeOf<Expected>()
  expectTypeOf<{ nested: ComputedRef<{ val: Ref<string> }> }>().toMatchTypeOf<Expected>()
  expectTypeOf<Ref<{ nested: ComputedRef<{ val: string }> }>>().toMatchTypeOf<Expected>()

  expectTypeOf<{ nested: { val: number } }>().not.toMatchTypeOf<Expected>()
  expectTypeOf<{ nested: { val: Ref<number> } }>().not.toMatchTypeOf<Expected>()
  expectTypeOf<Ref<{ nested: ComputedGetter<{ val: string }> }>>().not.toMatchTypeOf<Expected>()
})
