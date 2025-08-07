import * as ClientModule from '@orpc/client'
import { ping, pong } from '../tests/shared'
import { ContractProcedure, isContractProcedure } from './procedure'

const isORPCErrorStatusSpy = vi.spyOn(ClientModule, 'isORPCErrorStatus')

beforeEach(() => {
  vi.clearAllMocks()
})

describe('contractProcedure', () => {
  it('throws error when route.successStatus is invalid', () => {
    isORPCErrorStatusSpy.mockReturnValueOnce(true)

    expect(
      () => new ContractProcedure({ ...ping['~orpc'], route: { successStatus: 1999 } }),
    ).toThrowError()

    expect(isORPCErrorStatusSpy).toHaveBeenCalledTimes(1)
    expect(isORPCErrorStatusSpy).toHaveBeenCalledWith(1999)

    isORPCErrorStatusSpy.mockClear()
    isORPCErrorStatusSpy.mockReturnValueOnce(false)

    expect(
      () => new ContractProcedure({ ...ping['~orpc'], route: { successStatus: 2000 } }),
    ).not.toThrowError()

    expect(isORPCErrorStatusSpy).toHaveBeenCalledTimes(1)
    expect(isORPCErrorStatusSpy).toHaveBeenCalledWith(2000)
  })

  it('throws error when errorMap has invalid status code', () => {
    isORPCErrorStatusSpy.mockReturnValueOnce(false)

    expect(
      () => new ContractProcedure({
        ...ping['~orpc'],
        errorMap: { BAD_GATEWAY: { status: 200 } },
      }),
    ).toThrowError()

    expect(isORPCErrorStatusSpy).toHaveBeenCalledTimes(1)
    expect(isORPCErrorStatusSpy).toHaveBeenCalledWith(200)

    isORPCErrorStatusSpy.mockClear()
    isORPCErrorStatusSpy.mockReturnValueOnce(true)

    expect(
      () => new ContractProcedure({
        ...ping['~orpc'],
        errorMap: {
          BAD_GATEWAY: { status: 500 },
        },
      }),
    ).not.toThrowError()

    expect(isORPCErrorStatusSpy).toHaveBeenCalledTimes(1)
    expect(isORPCErrorStatusSpy).toHaveBeenCalledWith(500)
  })
})

describe('isContractProcedure', () => {
  it('works', () => {
    expect(ping).toSatisfy(isContractProcedure)
    expect(pong).toSatisfy(isContractProcedure)
    expect({}).not.toSatisfy(isContractProcedure)
    expect(true).not.toSatisfy(isContractProcedure)
    expect(1).not.toSatisfy(isContractProcedure)
    expect({ '~orpc': {} }).not.toSatisfy(isContractProcedure)
  })

  it('works with raw object', () => {
    expect(Object.assign({}, ping)).toSatisfy(isContractProcedure)
    expect(Object.assign({}, pong)).toSatisfy(isContractProcedure)
  })
})
