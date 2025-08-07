import { customJsonSchema } from './custom-json-schema'
import { blob } from './schemas/blob'
import { file } from './schemas/file'
import { regexp } from './schemas/regexp'
import { url } from './schemas/url'

export * from './coercer'
export * from './converter'
export * from './custom-json-schema'
export * from './schemas/base'
export * from './schemas/blob'
export * from './schemas/file'
export * from './schemas/regexp'
export * from './schemas/url'

export const oz = {
  file,
  blob,
  url,
  regexp,
  openapi: customJsonSchema,
}
