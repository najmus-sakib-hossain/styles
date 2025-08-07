import type { NodeHttpRequest } from './types'

export function toStandardUrl(req: NodeHttpRequest): URL {
  const protocol = ('encrypted' in req.socket && req.socket.encrypted ? 'https:' : 'http:')
  const host = req.headers.host ?? 'localhost'
  const url = new URL(req.originalUrl ?? req.url ?? '/', `${protocol}//${host}`)

  return url
}
