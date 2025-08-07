import type { GeneralUtils } from './general-utils'
import { ref } from 'vue'

describe('GeneralUtils', () => {
  describe('.key', () => {
    const utils = {} as GeneralUtils<{ a: { b: { c: number } } }>

    it('infer correct input type & input', () => {
      utils.key()
      utils.key({})
      utils.key({ input: { a: { b: { c: 1 } } } })

      // @ts-expect-error invalid input
      utils.key({ input: 123 })
      // @ts-expect-error invalid input
      utils.key({ input: { a: { b: { c: '1' } } } })

      // @ts-expect-error not allow ref
      utils.key({ input: { a: { b: ref({ c: 1 }) } } })

      // @ts-expect-error invalid input
      utils.key({ type: 'ddd' })
    })
  })
})
