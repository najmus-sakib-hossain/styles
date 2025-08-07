import type { APIGatewayProxyEventV2 } from './types'

export function toStandardUrl(event: APIGatewayProxyEventV2): URL {
  return new URL(`https://${event.requestContext.domainName}${event.rawPath}?${event.rawQueryString}`)
}
