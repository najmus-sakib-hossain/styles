import type { HTTPMethod } from '@orpc/client'
import type { AnyRouter } from './router'
import { fallbackContractConfig } from '@orpc/contract'
import { unlazy } from './lazy'
import { isProcedure } from './procedure'
import { getRouter } from './router-utils'

/**
 * Help RPCLink automatically send requests using the specified HTTP method in the router.
 */
export function inferRPCMethodFromRouter(router: AnyRouter): (options: unknown, path: readonly string[]) => Promise<Exclude<HTTPMethod, 'HEAD'>> {
  return async (_, path) => {
    const { default: procedure } = await unlazy(getRouter(router, path))

    if (!isProcedure(procedure)) {
      throw new Error(
        `[inferRPCMethodFromRouter] No valid procedure found at path "${path.join('.')}". `
        + `This may happen when the router is not properly configured.`,
      )
    }

    const method = fallbackContractConfig('defaultMethod', procedure['~orpc'].route.method)

    return method === 'HEAD' ? 'GET' : method
  }
}
