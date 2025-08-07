import { useQuery } from '@tanstack/react-query'
import { renderHook } from '@testing-library/react'
import { act } from 'react'
import { experimental_liveQuery as liveQuery } from '../src/live-query'
import { queryClient } from './shared'

it('liveQuery', async () => {
  const { result } = renderHook(() => useQuery({
    queryKey: ['live-query'],
    queryFn: liveQuery(async function* () {
      yield 1
      await new Promise(resolve => setTimeout(resolve, 50))
      yield 2
      await new Promise(resolve => setTimeout(resolve, 50))
      yield 3
    }),
  }, queryClient))

  expect(result.current.isLoading).toBe(true)

  await act(async () => {
    await vi.waitFor(() => expect(result.current.data).toEqual(1))
  })

  await act(async () => {
    await vi.waitFor(() => expect(result.current.data).toEqual(2))
  })

  await act(async () => {
    await vi.waitFor(() => expect(result.current.data).toEqual(3))
  })

  act(() => {
    result.current.refetch()
  })

  await act(async () => {
    await vi.waitFor(() => expect(result.current.data).toEqual(1))
  })
})
