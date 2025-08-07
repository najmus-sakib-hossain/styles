import type { StandardHandlerOptions, StandardHandlerPlugin } from '../adapters/standard'
import type { Context } from '../context'
import type { Router } from '../router'
import { experimental_HibernationEventIterator } from '@orpc/standard-server'

export interface experimental_HibernationPluginContext {
  iterator?: experimental_HibernationEventIterator<any>
}

/**
 * Enable Hibernation APIs
 *
 * @see {@link https://orpc.unnoq.com/docs/plugins/hibernation Hibernation Plugin}
 */
export class experimental_HibernationPlugin<T extends Context> implements StandardHandlerPlugin<T> {
  readonly CONTEXT_SYMBOL = Symbol('ORPC_HIBERNATION_CONTEXT')

  order = 2_000_000 // make sure execute after the batch plugin

  init(options: StandardHandlerOptions<T>, _router: Router<any, T>): void {
    options.interceptors ??= []
    options.clientInterceptors ??= []

    options.interceptors.unshift(async (options) => {
      const hibernationContext: experimental_HibernationPluginContext = {}

      const result = await options.next({
        ...options,
        context: {
          [this.CONTEXT_SYMBOL]: hibernationContext,
          ...options.context,
        },
      })

      if (!result.matched || !hibernationContext.iterator) {
        return result
      }

      return {
        ...result,
        response: {
          ...result.response,
          body: hibernationContext.iterator,
        },
      }
    })

    options.clientInterceptors.unshift(async (options) => {
      const hibernationContext = options.context[this.CONTEXT_SYMBOL] as experimental_HibernationPluginContext | undefined

      if (!hibernationContext) {
        throw new TypeError('[HibernationPlugin] Hibernation context has been corrupted or modified by another plugin or interceptor')
      }

      const output = await options.next()

      if (output instanceof experimental_HibernationEventIterator) {
        hibernationContext.iterator = output
      }

      return output
    })
  }
}
