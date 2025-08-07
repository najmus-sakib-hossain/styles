import type { ClientContext } from '@orpc/client'
import type { StandardLinkClient, StandardLinkOptions } from '@orpc/client/standard'
import type { AnyContractRouter } from '@orpc/contract'
import type { StandardOpenAPIJsonSerializerOptions } from './openapi-json-serializer'
import type { StandardOpenapiLinkCodecOptions } from './openapi-link-codec'
import { StandardLink } from '@orpc/client/standard'
import { StandardBracketNotationSerializer } from './bracket-notation'
import { StandardOpenAPIJsonSerializer } from './openapi-json-serializer'
import { StandardOpenapiLinkCodec } from './openapi-link-codec'
import { StandardOpenAPISerializer } from './openapi-serializer'

export interface StandardOpenAPILinkOptions<T extends ClientContext>
  extends StandardLinkOptions<T>, StandardOpenapiLinkCodecOptions<T>, StandardOpenAPIJsonSerializerOptions {}

export class StandardOpenAPILink<T extends ClientContext> extends StandardLink<T> {
  constructor(contract: AnyContractRouter, linkClient: StandardLinkClient<T>, options: StandardOpenAPILinkOptions<T>) {
    const jsonSerializer = new StandardOpenAPIJsonSerializer(options)
    // Server response is trusted, so we can use the maximum possible array index.
    const bracketNotationSerializer = new StandardBracketNotationSerializer({ maxBracketNotationArrayIndex: 4_294_967_294 })
    const serializer = new StandardOpenAPISerializer(jsonSerializer, bracketNotationSerializer)
    const linkCodec = new StandardOpenapiLinkCodec(contract, serializer, options)

    super(linkCodec, linkClient, options)
  }
}
