import type { JsonifiedClient } from '@orpc/openapi-client'
import type { AnyRouter, ClientContext, CreateProcedureClientOptions, ErrorMap, InferRouterInitialContext, Lazyable, Meta, RouterClient, Schema } from '@orpc/server'
import type { MaybeOptionalOptions } from '@orpc/shared'
import { createORPCErrorFromJson } from '@orpc/client'
import { StandardBracketNotationSerializer, StandardOpenAPIJsonSerializer, StandardOpenAPISerializer } from '@orpc/openapi-client/standard'
import { createRouterClient, ORPCError } from '@orpc/server'
import { resolveMaybeOptionalOptions } from '@orpc/shared'

export function createJsonifiedRouterClient<T extends AnyRouter, TClientContext extends ClientContext>(
  router: Lazyable<T | undefined>,
  ...rest: MaybeOptionalOptions<
    CreateProcedureClientOptions<
      InferRouterInitialContext<T>,
      Schema<unknown, unknown>,
      ErrorMap,
      Meta,
      TClientContext
    >
  >
): JsonifiedClient<RouterClient<T, TClientContext>> {
  const options = resolveMaybeOptionalOptions(rest)

  const serializer = new StandardOpenAPISerializer(new StandardOpenAPIJsonSerializer(), new StandardBracketNotationSerializer())

  options.interceptors ??= []
  options.interceptors.unshift(async (options) => {
    try {
      return serializer.deserialize(
        serializer.serialize(
          await options.next(),
        ),
      )
    }
    catch (e) {
      if (e instanceof ORPCError) {
        throw createORPCErrorFromJson(serializer.deserialize(
          serializer.serialize(
            e.toJSON(),
            { outputFormat: 'plain' },
          ),
        ) as any)
      }

      throw e
    }
  })

  return createRouterClient(router, options) as any
}
