import type { StandardRPCJsonSerializerOptions } from '@orpc/client/standard'
import type { Context } from '../../context'
import type { Router } from '../../router'
import type { StandardHandlerOptions } from './handler'
import type { StandardRPCMatcherOptions } from './rpc-matcher'
import { StandardRPCJsonSerializer, StandardRPCSerializer } from '@orpc/client/standard'
import { StandardHandler } from './handler'
import { StandardRPCCodec } from './rpc-codec'
import { StandardRPCMatcher } from './rpc-matcher'

export interface StandardRPCHandlerOptions<T extends Context>
  extends StandardHandlerOptions<T>, StandardRPCJsonSerializerOptions, StandardRPCMatcherOptions {
}

export class StandardRPCHandler<T extends Context> extends StandardHandler<T> {
  constructor(router: Router<any, T>, options: StandardRPCHandlerOptions<T> = {}) {
    const jsonSerializer = new StandardRPCJsonSerializer(options)
    const serializer = new StandardRPCSerializer(jsonSerializer)
    const matcher = new StandardRPCMatcher(options)
    const codec = new StandardRPCCodec(serializer)

    super(router, matcher, codec, options)
  }
}
