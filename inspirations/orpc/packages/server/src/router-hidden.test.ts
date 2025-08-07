import { contract, router } from '../tests/shared'
import { getHiddenRouterContract, setHiddenRouterContract } from './router-hidden'

it('setHiddenRouterContract & getHiddenRouterContract', () => {
  const applied = setHiddenRouterContract(router, contract)

  expect(applied).toEqual(router)
  expect(getHiddenRouterContract(applied)).toEqual(contract)
})
