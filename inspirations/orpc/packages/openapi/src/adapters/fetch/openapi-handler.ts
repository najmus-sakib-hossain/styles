import type { Context, Router } from '@orpc/server'
import type { FetchHandlerOptions } from '@orpc/server/fetch'
import type { StandardOpenAPIHandlerOptions } from '../standard'
import { FetchHandler } from '@orpc/server/fetch'
import { StandardOpenAPIHandler } from '../standard'

/**
 * OpenAPI Handler for Fetch Server
 *
 * @see {@link https://orpc.unnoq.com/docs/openapi/openapi-handler OpenAPI Handler Docs}
 * @see {@link https://orpc.unnoq.com/docs/adapters/http HTTP Adapter Docs}
 */
export class OpenAPIHandler<T extends Context> extends FetchHandler<T> {
  constructor(router: Router<any, T>, options: NoInfer<StandardOpenAPIHandlerOptions<T> & FetchHandlerOptions<T>> = {}) {
    super(new StandardOpenAPIHandler(router, options), options)
  }
}
