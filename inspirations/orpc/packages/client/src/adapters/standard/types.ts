import type { StandardLazyResponse, StandardRequest } from '@orpc/standard-server'
import type { ClientContext, ClientOptions } from '../../types'

export interface StandardLinkCodec<T extends ClientContext> {
  encode(path: readonly string[], input: unknown, options: ClientOptions<T>): Promise<StandardRequest>
  decode(response: StandardLazyResponse, options: ClientOptions<T>, path: readonly string[], input: unknown): Promise<unknown>
}

export interface StandardLinkClient<T extends ClientContext> {
  call(request: StandardRequest, options: ClientOptions<T>, path: readonly string[], input: unknown): Promise<StandardLazyResponse>
}
