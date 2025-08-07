import { os } from '@orpc/server'
import { act, renderHook, waitFor } from '@testing-library/react'
import { useState } from 'react'
import { inputSchema } from '../../../contract/tests/shared'
import { useOptimisticServerAction } from './optimistic-server-action'

beforeEach(() => {
  vi.clearAllMocks()
})

describe('useOptimisticServerAction', () => {
  const handler = vi.fn(async ({ input }) => {
    return { output: Number(input?.input ?? 0) }
  })

  const action = os
    .input(inputSchema)
    .handler(handler)
    .actionable()

  it.each(['success', 'error'])('on %s', async (scenario) => {
    if (scenario === 'error') {
      handler.mockRejectedValueOnce(new Error('Test error'))
    }

    const { result } = renderHook(() => {
      const [outputs, setOutputs] = useState(() => [{ output: 0 }])
      const state = useOptimisticServerAction(action, {
        optimisticPassthrough: outputs,
        optimisticReducer(state, input) {
          return [...state, { output: Number(input?.input ?? 0) }]
        },
      })

      return { state, setOutputs }
    })

    act(() => {
      result.current.state.execute({ input: 123 })
    })

    expect(result.current.state.optimisticState).toEqual([{ output: 0 }, { output: 123 }])

    await waitFor(() => expect(result.current.state.status).toBe(scenario))

    expect(result.current.state.optimisticState).toEqual([{ output: 0 }])

    act(() => {
      result.current.setOutputs(prev => [...prev, { output: 123 }])
    })

    expect(result.current.state.optimisticState).toEqual([{ output: 0 }, { output: 123 }])
  })
})
