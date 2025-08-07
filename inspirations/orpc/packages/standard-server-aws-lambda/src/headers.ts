import type { StandardHeaders } from '@orpc/standard-server'
import type { APIGatewayProxyEventHeaders } from './types'
import { toArray } from '@orpc/shared'
import { flattenHeader } from '@orpc/standard-server'

export function toStandardHeaders(
  headers: APIGatewayProxyEventHeaders,
  cookies: string[] | undefined,
): StandardHeaders {
  return {
    ...headers,
    'set-cookie': cookies,
  }
}

export function toLambdaHeaders(standard: StandardHeaders): [headers: APIGatewayProxyEventHeaders, setCookies: string[]] {
  const headers: APIGatewayProxyEventHeaders = {}
  const setCookies: string[] = []

  for (const key in standard) {
    const value = standard[key]

    if (value === undefined) {
      continue
    }

    if (key === 'set-cookie') {
      setCookies.push(...toArray(value))
    }
    else {
      headers[key] = flattenHeader(value)
    }
  }

  return [headers, setCookies]
}
