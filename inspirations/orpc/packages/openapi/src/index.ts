import { customOpenAPIOperation } from './openapi-custom'

export * from './openapi-custom'
export * from './openapi-generator'
export * from './openapi-utils'
export * from './router-client'
export * from './schema'
export * from './schema-converter'
export * from './schema-utils'

export type { OpenAPI } from '@orpc/contract'

export const oo = {
  spec: customOpenAPIOperation,
}
