import { isObject } from '@orpc/shared'

export type StandardOpenAPIJsonSerialized = [json: unknown, hasBlob: boolean]

export interface StandardOpenAPICustomJsonSerializer {
  condition(data: unknown): boolean
  serialize(data: any): unknown
}

export interface StandardOpenAPIJsonSerializerOptions {
  customJsonSerializers?: readonly StandardOpenAPICustomJsonSerializer[]
}

export class StandardOpenAPIJsonSerializer {
  private readonly customSerializers: readonly StandardOpenAPICustomJsonSerializer[]

  constructor(options: StandardOpenAPIJsonSerializerOptions = {}) {
    this.customSerializers = options.customJsonSerializers ?? []
  }

  serialize(data: unknown, hasBlobRef: { value: boolean } = { value: false }): StandardOpenAPIJsonSerialized {
    for (const custom of this.customSerializers) {
      if (custom.condition(data)) {
        const result = this.serialize(custom.serialize(data), hasBlobRef)

        return result
      }
    }

    if (data instanceof Blob) {
      hasBlobRef.value = true
      return [data, hasBlobRef.value]
    }

    if (data instanceof Set) {
      return this.serialize(Array.from(data), hasBlobRef)
    }

    if (data instanceof Map) {
      return this.serialize(Array.from(data.entries()), hasBlobRef)
    }

    if (Array.isArray(data)) {
      const json = data.map(v => v === undefined ? null : this.serialize(v, hasBlobRef)[0])
      return [json, hasBlobRef.value]
    }

    if (isObject(data)) {
      const json: Record<string, unknown> = {}

      for (const k in data) {
        /**
         * Skip custom toJSON methods to avoid JSON.stringify invoking them,
         * which could cause meta and serialized data mismatches during deserialization.
         * Instead, rely on custom serializers.
         */
        if (k === 'toJSON' && typeof data[k] === 'function') {
          continue
        }

        json[k] = this.serialize(data[k], hasBlobRef)[0]
      }

      return [json, hasBlobRef.value]
    }

    if (typeof data === 'bigint' || data instanceof RegExp || data instanceof URL) {
      return [data.toString(), hasBlobRef.value]
    }

    if (data instanceof Date) {
      return [Number.isNaN(data.getTime()) ? null : data.toISOString(), hasBlobRef.value]
    }

    if (Number.isNaN(data)) {
      return [null, hasBlobRef.value]
    }

    return [data, hasBlobRef.value]
  }
}
