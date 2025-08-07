import type { SchemaIssue } from './schema'
import { isPropertyKey, isTypescriptObject } from '@orpc/shared'

export function isSchemaIssue(issue: unknown): issue is SchemaIssue {
  if (!isTypescriptObject(issue) || typeof issue.message !== 'string') {
    return false
  }

  if (issue.path !== undefined) {
    if (!Array.isArray(issue.path)) {
      return false
    }

    if (
      !issue.path.every(segment => isPropertyKey(segment) || (isTypescriptObject(segment) && isPropertyKey(segment.key)))
    ) {
      return false
    }
  }

  return true
}
