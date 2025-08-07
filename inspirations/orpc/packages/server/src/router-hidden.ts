import type { AnyContractRouter } from '@orpc/contract'
import type { Lazyable } from './lazy'
import type { AnyRouter } from './router'

const HIDDEN_ROUTER_CONTRACT_SYMBOL = Symbol('ORPC_HIDDEN_ROUTER_CONTRACT')

export function setHiddenRouterContract<T extends Lazyable<AnyRouter>>(router: T, contract: AnyContractRouter): T {
  return new Proxy(router, {
    get(target, key) {
      if (key === HIDDEN_ROUTER_CONTRACT_SYMBOL) {
        return contract
      }

      return Reflect.get(target, key)
    },
  })
}

export function getHiddenRouterContract(router: Lazyable<AnyRouter | AnyContractRouter>): AnyContractRouter | undefined {
  return (router as any)[HIDDEN_ROUTER_CONTRACT_SYMBOL]
}
