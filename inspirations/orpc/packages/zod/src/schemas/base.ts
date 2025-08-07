import type { CustomErrorParams, ZodTypeDef } from 'zod/v3'

export type CustomParams = CustomErrorParams & {
  fatal?: boolean
}

const CUSTOM_ZOD_DEF_SYMBOL = Symbol('ORPC_CUSTOM_ZOD_DEF')

export type CustomZodDef = {
  type: 'blob' | 'regexp' | 'url'
} | {
  type: 'file'
  mimeType?: string
}

export function setCustomZodDef<T extends ZodTypeDef>(def: T, custom: CustomZodDef): void {
  Object.assign(def, { [CUSTOM_ZOD_DEF_SYMBOL]: custom })
}

export function getCustomZodDef(def: ZodTypeDef): CustomZodDef | undefined {
  return (def as any)[CUSTOM_ZOD_DEF_SYMBOL] as CustomZodDef | undefined
}

export function composeParams<T = unknown>(
  defaultMessage: (input: T) => string,
  params: undefined | string | CustomParams | ((input: T) => CustomParams),
): (input: T) => CustomParams {
  return (val) => {
    const message = defaultMessage(val)

    if (!params) {
      return {
        message,
      }
    }

    if (typeof params === 'function') {
      return {
        message,
        ...params(val),
      }
    }

    if (typeof params === 'object') {
      return {
        message,
        ...params,
      }
    }

    return {
      message: params,
    }
  }
}
