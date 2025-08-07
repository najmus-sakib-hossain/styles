import { createRouterUtils } from './router-utils'

export * from './general-utils'
export * from './procedure-utils'
export * from './router-utils'
export * from './types'

export {
  createRouterUtils as createORPCReactQueryUtils,
}

export type { OperationKeyOptions as BuildKeyOptions, OperationType as KeyType } from '@orpc/tanstack-query'
export { generateOperationKey as buildKey } from '@orpc/tanstack-query'
