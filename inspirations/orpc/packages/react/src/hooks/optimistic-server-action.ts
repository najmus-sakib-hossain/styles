import type { ORPCErrorJSON } from '@orpc/client'
import type { ActionableClient, UnactionableError } from '@orpc/server'
import type { UseServerActionOptions, UseServerActionResult } from './server-action'
import { onStart, toArray } from '@orpc/shared'
import { useCallback, useMemo, useOptimistic } from 'react'
import { useServerAction } from './server-action'

export interface UseOptimisticServerActionOptions<TInput, TOutput, TError, TOptimisticState> extends
  UseServerActionOptions<TInput, TOutput, TError> {
  optimisticPassthrough: TOptimisticState
  optimisticReducer: (state: TOptimisticState, input: TInput) => TOptimisticState
}

export type UseOptimisticServerActionResult<TInput, TOutput, TError, TOptimisticState> = UseServerActionResult<TInput, TOutput, TError> & {
  optimisticState: TOptimisticState
}

export function useOptimisticServerAction<TInput, TOutput, TError extends ORPCErrorJSON<any, any>, TOptimisticState>(
  action: ActionableClient<TInput, TOutput, TError>,
  options: UseOptimisticServerActionOptions<TInput, TOutput, UnactionableError<TError>, TOptimisticState>,
): UseOptimisticServerActionResult<TInput, TOutput, UnactionableError<TError>, TOptimisticState> {
  const [optimisticState, addOptimistic] = useOptimistic(options.optimisticPassthrough, options.optimisticReducer)

  const state = useServerAction(action, {
    ...options,
    interceptors: [
      useCallback(onStart(({ input }) => {
        addOptimistic(input)
      }), [addOptimistic]),
      ...toArray(options.interceptors),
    ],
  })

  return useMemo(() => ({ ...state, optimisticState }), [state, optimisticState]) as any
}
