import type { HTTPPath, ORPCError } from '@orpc/client'
import type { StandardLazyRequest, StandardResponse } from '@orpc/standard-server'
import type { AnyProcedure } from '../../procedure'
import type { AnyRouter } from '../../router'

export type StandardParams = Record<string, string>

export type StandardMatchResult = {
  path: readonly string[]
  procedure: AnyProcedure
  params?: StandardParams
} | undefined

export interface StandardMatcher {
  init(router: AnyRouter): void
  match(method: string, pathname: HTTPPath): Promise<StandardMatchResult>
}

export interface StandardCodec {
  encode(output: unknown, procedure: AnyProcedure): StandardResponse
  encodeError(error: ORPCError<any, any>): StandardResponse
  decode(request: StandardLazyRequest, params: StandardParams | undefined, procedure: AnyProcedure): Promise<unknown>
}
