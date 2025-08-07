import type { HTTPPath } from '../../types'
import { COMMON_ORPC_ERROR_DEFS } from '../../error'

export function toHttpPath(path: readonly string[]): HTTPPath {
  return `/${path.map(encodeURIComponent).join('/')}`
}

export function getMalformedResponseErrorCode(status: number): string {
  return Object.entries(COMMON_ORPC_ERROR_DEFS).find(([, def]) => def.status === status)?.[0] ?? 'MALFORMED_ORPC_ERROR_RESPONSE'
}
