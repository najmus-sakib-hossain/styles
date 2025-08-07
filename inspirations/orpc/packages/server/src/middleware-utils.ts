import type { AnyMiddleware } from './middleware'

export function isStartWithMiddlewares(middlewares: readonly AnyMiddleware[], compare: readonly AnyMiddleware[]): boolean {
  if (compare.length > middlewares.length) {
    return false
  }

  for (let i = 0; i < middlewares.length; i++) {
    if (compare[i] === undefined) {
      return true
    }

    if (middlewares[i] !== compare[i]) {
      return false
    }
  }

  return true
}

export function mergeMiddlewares(first: readonly AnyMiddleware[], second: readonly AnyMiddleware[], options: { dedupeLeading: boolean }): readonly AnyMiddleware[] {
  if (options.dedupeLeading && isStartWithMiddlewares(second, first)) {
    return second
  }

  return [...first, ...second]
}

export function addMiddleware(middlewares: readonly AnyMiddleware[], addition: AnyMiddleware): AnyMiddleware[] {
  return [...middlewares, addition]
}
