import type { Promisable } from '@orpc/shared'
import type { StandardHeaders, StandardResponse } from '../types'
import { isAsyncIteratorObject, isObject } from '@orpc/shared'

export type BatchResponseMode = 'streaming' | 'buffered'

export interface BatchResponseBodyItem extends StandardResponse {
  index: number
}

export interface ToBatchResponseOptions extends StandardResponse {
  body: AsyncIteratorObject<BatchResponseBodyItem>

  /**
   * @default 'streaming'
   */
  mode?: BatchResponseMode
}

export function toBatchResponse(options: ToBatchResponseOptions): Promisable<StandardResponse> {
  const mode = options.mode ?? 'streaming'

  const minifyResponseItem = (item: BatchResponseBodyItem): Partial<BatchResponseBodyItem> => {
    return {
      index: item.index,
      status: item.status === options.status ? undefined : item.status,
      headers: Object.keys(item.headers).length ? item.headers : undefined,
      body: item.body,
    }
  }

  if (mode === 'buffered') {
    return (async () => {
      try {
        const body: Partial<BatchResponseBodyItem>[] = []

        for await (const item of options.body) {
          body.push(minifyResponseItem(item))
        }

        return {
          headers: options.headers,
          status: options.status,
          body,
        }
      }
      finally {
        await options.body.return?.()
      }
    })()
  }

  return {
    headers: options.headers,
    status: options.status,
    body: (async function* () {
      try {
        for await (const item of options.body) {
          yield {
            index: item.index,
            status: item.status === options.status ? undefined : item.status,
            headers: Object.keys(item.headers).length ? item.headers : undefined,
            body: item.body,
          } satisfies Partial<BatchResponseBodyItem>
        }
      }
      finally {
        await options.body.return?.()
      }
    })(),
  }
}

export function parseBatchResponse(response: StandardResponse): AsyncGenerator<BatchResponseBodyItem> {
  const body = response.body

  if (isAsyncIteratorObject(body) || Array.isArray(body)) {
    return (async function* () {
      try {
        for await (const item of body) {
          if (!isObject(item) || !('index' in item) || typeof item.index !== 'number') {
            throw new TypeError('Invalid batch response', {
              cause: item,
            })
          }

          yield {
            index: item.index,
            status: item.status as undefined | number ?? response.status,
            headers: item.headers as undefined | StandardHeaders ?? {},
            body: item.body,
          } satisfies BatchResponseBodyItem
        }
      }
      finally {
        if (isAsyncIteratorObject(body)) {
          await body.return?.()
        }
      }
    })()
  }

  throw new TypeError('Invalid batch response', {
    cause: response,
  })
}
