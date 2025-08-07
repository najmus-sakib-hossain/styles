import { isContractProcedure } from '@orpc/contract'
import { ping } from '../tests/shared'
import { isProcedure } from './procedure'

describe('procedure', () => {
  it('also a contract procedure', () => {
    expect(ping).toSatisfy(isContractProcedure)
  })
})

it('isProcedure', () => {
  expect(ping).toSatisfy(isProcedure)
  expect(Object.assign({}, ping)).toSatisfy(isProcedure)

  expect({}).not.toSatisfy(isProcedure)
  expect(true).not.toSatisfy(isProcedure)
})
