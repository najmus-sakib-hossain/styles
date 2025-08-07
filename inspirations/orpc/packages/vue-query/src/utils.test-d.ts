import type { ComputedRef, Ref } from 'vue'
import type { UnrefDeep } from './utils'

it('UnrefDeep', () => {
  expectTypeOf<UnrefDeep<{
    primitive: number
    nested: ComputedRef<{
      primitive: number
      date: Ref<Date>
      url: URL
      regex: RegExp
      set: Set<number>
      map: Map<string, number>
      nested: ComputedRef<{
        primitive: number
        date: Date
        url: URL
        regex: Ref<RegExp>
        set: Set<number>
        map: Map<string, number>
      }>
    }>
  }>>().toEqualTypeOf<{
    primitive: number
    nested: {
      primitive: number
      date: Date
      url: URL
      regex: RegExp
      set: Set<number>
      map: Map<string, number>
      nested: {
        primitive: number
        date: Date
        url: URL
        regex: RegExp
        set: Set<number>
        map: Map<string, number>
      }
    }
  }>()
})
