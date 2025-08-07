import type { ZodType, ZodTypeDef } from 'zod/v3'
import type { CustomParams } from './base'
import { custom } from 'zod/v3'
import { composeParams, setCustomZodDef } from './base'

export function blob(
  params?: string | CustomParams | ((input: unknown) => CustomParams),
): ZodType<Blob, ZodTypeDef, Blob> {
  const schema = custom<Blob>(
    val => val instanceof Blob,
    composeParams(
      () => 'Input is not a blob',
      params,
    ),
  )

  setCustomZodDef(schema._def, { type: 'blob' })

  return schema
}
