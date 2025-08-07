import type { ClientContext } from '../../types'
import type { StandardRPCLinkOptions } from '../standard'
import type { LinkFetchClientOptions } from './link-fetch-client'
import { StandardRPCLink } from '../standard'
import { LinkFetchClient } from './link-fetch-client'

export interface RPCLinkOptions<T extends ClientContext>
  extends StandardRPCLinkOptions<T>, LinkFetchClientOptions<T> {}

/**
 * The RPC Link communicates with the server using the RPC protocol.
 *
 * @see {@link https://orpc.unnoq.com/docs/client/rpc-link RPC Link Docs}
 * @see {@link https://orpc.unnoq.com/docs/advanced/rpc-protocol RPC Protocol Docs}
 */
export class RPCLink<T extends ClientContext> extends StandardRPCLink<T> {
  constructor(options: RPCLinkOptions<T>) {
    const linkClient = new LinkFetchClient(options)

    super(linkClient, options)
  }
}
