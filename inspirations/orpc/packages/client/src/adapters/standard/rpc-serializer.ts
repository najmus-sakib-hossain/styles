import type { StandardRPCJsonSerializer } from './rpc-json-serializer'
import { isAsyncIteratorObject, stringifyJSON } from '@orpc/shared'
import { ErrorEvent } from '@orpc/standard-server'
import { createORPCErrorFromJson, isORPCErrorJson, toORPCError } from '../../error'
import { mapEventIterator } from '../../event-iterator'

export class StandardRPCSerializer {
  constructor(
    private readonly jsonSerializer: StandardRPCJsonSerializer,
  ) {}

  serialize(data: unknown): object {
    if (isAsyncIteratorObject(data)) {
      return mapEventIterator(data, {
        value: async (value: unknown) => this.#serialize(value, false),
        error: async (e) => {
          return new ErrorEvent({
            data: this.#serialize(toORPCError(e).toJSON(), false),
            cause: e,
          })
        },
      })
    }

    return this.#serialize(data, true)
  }

  #serialize(
    data: unknown,
    enableFormData: boolean,
  ): object {
    const [json, meta_, maps, blobs] = this.jsonSerializer.serialize(data)

    const meta = meta_.length === 0 ? undefined : meta_

    if (!enableFormData || blobs.length === 0) {
      return {
        json,
        meta,
      }
    }

    const form = new FormData()

    form.set('data', stringifyJSON({ json, meta, maps }))

    blobs.forEach((blob, i) => {
      form.set(i.toString(), blob)
    })

    return form
  }

  deserialize(data: unknown): unknown {
    if (isAsyncIteratorObject(data)) {
      return mapEventIterator(data, {
        value: async value => this.#deserialize(value),
        error: async (e) => {
          if (!(e instanceof ErrorEvent)) {
            return e
          }

          const deserialized = this.#deserialize(e.data)

          if (isORPCErrorJson(deserialized)) {
            return createORPCErrorFromJson(deserialized, { cause: e })
          }

          return new ErrorEvent({
            data: deserialized,
            cause: e,
          })
        },
      })
    }

    return this.#deserialize(data)
  }

  #deserialize(data: any): unknown {
    if (!(data instanceof FormData)) {
      return this.jsonSerializer.deserialize(data.json, data.meta ?? [])
    }

    const serialized = JSON.parse(data.get('data') as string)

    return this.jsonSerializer.deserialize(
      serialized.json,
      serialized.meta ?? [],
      serialized.maps,
      (i: number) => data.get(i.toString()) as Blob,
    )
  }
}
