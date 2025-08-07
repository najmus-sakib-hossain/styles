import { ContractProcedure } from '@orpc/contract'
import * as z from 'zod'
import { contract, ping } from '../tests/shared'
import { lazy, unlazy } from './lazy'
import { Procedure } from './procedure'
import { createProcedureClient } from './procedure-client'
import { call, createAssertedLazyProcedure, createContractedProcedure } from './procedure-utils'

vi.mock('./procedure-client', async original => ({
  ...await original(),
  createProcedureClient: vi.fn(() => vi.fn()),
}))

it('createAssertedLazyProcedure', () => {
  const asserted = createAssertedLazyProcedure(lazy(() => Promise.resolve({ default: ping })))
  expect(unlazy(asserted)).resolves.toEqual({ default: ping })
  const asserted2 = createAssertedLazyProcedure(lazy(() => Promise.resolve({ default: 123 })))
  expect(unlazy(asserted2)).rejects.toThrowError('Expected a lazy<procedure> but got lazy<unknown>.')
})

it('createContractedProcedure', () => {
  const mismatchPath = {
    errorMap: {
      MISMATCH_HERE: {},
    },
    meta: {
      MISMATCH_HERE: {},
    },
    route: {
      path: '/MISMATCH_HERE',
    },
  } as const

  const contracted = createContractedProcedure(ping, new ContractProcedure({
    ...contract.ping['~orpc'],
    ...mismatchPath,
    inputSchema: z.object({}), // this will be ignored
  }))

  expect(contracted).toBeInstanceOf(Procedure)
  expect(contracted['~orpc']).toEqual({
    ...ping['~orpc'],
    ...mismatchPath,
  })
})

it('call', async () => {
  const client = vi.fn(async () => '__output__')
  vi.mocked(createProcedureClient).mockReturnValueOnce(client)

  const options = { context: { db: 'postgres' }, signal: AbortSignal.timeout(1000), lastEventId: '123' }
  const output = await call(ping, { input: 123 }, options)

  expect(output).toBe('__output__')
  expect(createProcedureClient).toBeCalledTimes(1)
  expect(createProcedureClient).toBeCalledWith(ping, options)
  expect(client).toBeCalledTimes(1)
  expect(client).toBeCalledWith({ input: 123 }, options)
})
