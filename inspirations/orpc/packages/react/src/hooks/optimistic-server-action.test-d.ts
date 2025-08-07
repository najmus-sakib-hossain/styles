import { os } from '@orpc/server'
import { inputSchema } from '../../../contract/tests/shared'
import { useOptimisticServerAction } from './optimistic-server-action'

describe('useOptimisticServerAction', () => {
  const action = os
    .input(inputSchema.optional())
    .handler(async ({ input }) => {
      return { output: Number(input) }
    })
    .actionable()

  it('can infer optimistic state', () => {
    const state = useOptimisticServerAction(action, {
      optimisticPassthrough: [{ output: 0 }],
      optimisticReducer(state, input) {
        expectTypeOf(state).toEqualTypeOf<{ output: number }[]>()
        expectTypeOf(input).toEqualTypeOf<{ input: number } | undefined>()
        return [...state, { output: Number(input?.input) }]
      },
    })

    expectTypeOf(state.optimisticState).toEqualTypeOf<{ output: number }[]>()
  })
})
