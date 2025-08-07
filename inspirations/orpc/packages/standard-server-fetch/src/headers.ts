import type { StandardHeaders } from '@orpc/standard-server'

/**
 * @param headers
 * @param standardHeaders - The base headers can be changed by the function and effects on the original headers.
 */
export function toStandardHeaders(headers: Headers, standardHeaders: StandardHeaders = {}): StandardHeaders {
  for (const [key, value] of headers) {
    if (Array.isArray(standardHeaders[key])) {
      standardHeaders[key].push(value)
    }
    else if (standardHeaders[key] !== undefined) {
      standardHeaders[key] = [standardHeaders[key], value]
    }
    else {
      standardHeaders[key] = value
    }
  }

  return standardHeaders
}

/**
 * @param headers
 * @param fetchHeaders - The base headers can be changed by the function and effects on the original headers.
 */
export function toFetchHeaders(headers: StandardHeaders, fetchHeaders: Headers = new Headers()): Headers {
  for (const [key, value] of Object.entries(headers)) {
    if (Array.isArray(value)) {
      for (const v of value) {
        fetchHeaders.append(key, v)
      }
    }
    else if (value !== undefined) {
      fetchHeaders.append(key, value)
    }
  }

  return fetchHeaders
}
