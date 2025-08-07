import type { Interceptor } from '@orpc/shared'
import type { DurableEventIteratorObject } from '.'
import type { DurableEventIteratorTokenPayload } from '../schemas'
import { intercept, stringifyJSON, toArray } from '@orpc/shared'
import { jwtVerify } from 'jose'
import * as v from 'valibot'
import { DURABLE_EVENT_ITERATOR_TOKEN_PARAM } from '../consts'
import { DurableEventIteratorTokenPayloadSchema } from '../schemas'
import { DURABLE_EVENT_ITERATOR_TOKEN_PAYLOAD_KEY } from './consts'

export interface UpgradeDurableEventIteratorRequestOptions {
  signingKey: string
  namespace: DurableObjectNamespace<any>
  interceptors?: Interceptor<{ payload: DurableEventIteratorTokenPayload }, Promise<Response>>[]
}

/**
 * Verifies and upgrades a durable event iterator request.
 */
export async function upgradeDurableEventIteratorRequest(
  request: Request,
  options: UpgradeDurableEventIteratorRequestOptions,
): Promise<Response> {
  if (request.headers.get('upgrade') !== 'websocket') {
    return new Response('Expected WebSocket upgrade', {
      status: 426,
    })
  }

  const url = new URL(request.url)
  const token = url.searchParams.getAll(DURABLE_EVENT_ITERATOR_TOKEN_PARAM).at(-1)

  if (!token) {
    return new Response('Token is required', {
      status: 401,
    })
  }

  let payload

  try {
    const result = await jwtVerify(token, new TextEncoder().encode(options.signingKey))
    payload = v.parse(DurableEventIteratorTokenPayloadSchema, result.payload)
  }
  catch {
    return new Response('Invalid Token', {
      status: 401,
    })
  }

  return intercept(
    toArray(options.interceptors),
    { payload },
    async ({ payload }) => {
      const namespace = options.namespace as DurableObjectNamespace<DurableEventIteratorObject<any, any, any>>
      const id = namespace.idFromName(payload.chn)
      const stub = namespace.get(id)

      const upgradeUrl = new URL(url.origin + url.pathname)

      upgradeUrl.searchParams.set(DURABLE_EVENT_ITERATOR_TOKEN_PAYLOAD_KEY, stringifyJSON(payload))

      return stub.fetch(upgradeUrl, request)
    },
  )
}
