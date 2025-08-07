import { ORPCError } from '@orpc/contract'
import { isAsyncIteratorObject, parseEmptyableJSON } from '@orpc/shared'
import { ErrorEvent, getEventMeta, withEventMeta } from '@orpc/standard-server'
import { supportedDataTypes } from '../../../tests/shared'
import { StandardRPCJsonSerializer } from './rpc-json-serializer'
import { StandardRPCSerializer } from './rpc-serializer'

describe.each(supportedDataTypes)('standardRPCSerializer: $name', ({ value, expected }) => {
  const serializer = new StandardRPCSerializer(new StandardRPCJsonSerializer())

  function serializeAndDeserialize(value: unknown): unknown {
    const serialized = serializer.serialize(value)

    if (serialized instanceof FormData || serialized instanceof Blob) {
      return serializer.deserialize(serialized)
    }

    return serializer.deserialize(parseEmptyableJSON(JSON.stringify(serialized) ?? '')) // like in the real world
  }

  it('should work on flat', async () => {
    expect(
      serializeAndDeserialize(value),
    ).toEqual(
      expected,
    )
  })

  it('should work on nested object', async () => {
    expect(
      serializeAndDeserialize({
        data: value,
      }),
    ).toEqual(
      {
        data: expected,
      },
    )
  })

  it('should work on complex object', async () => {
    expect(
      serializeAndDeserialize({
        '!@#$%^^&()[]>?<~_<:"~+!_': value,
        'list': [value],
        'map': new Map([[value, value]]),
        'set': new Set([value]),
        'nested': {
          nested: value,
        },
      }),
    ).toEqual({
      '!@#$%^^&()[]>?<~_<:"~+!_': expected,
      'list': [expected],
      'map': new Map([[expected, expected]]),
      'set': new Set([expected]),
      'nested': {
        nested: expected,
      },
    })
  })
})

describe('standardRPCSerializer: event iterator', async () => {
  const serializer = new StandardRPCSerializer(new StandardRPCJsonSerializer())

  function serializeAndDeserialize(value: unknown): unknown {
    const serialized = serializer.serialize(value)
    return serializer.deserialize(serialized)
  }

  const date = new Date()

  it('on success', async () => {
    const iterator = (async function* () {
      yield 1
      yield withEventMeta({ order: 2, date }, { retry: 1000 })
      return withEventMeta({ order: 3 }, { id: '123456' })
    })()

    const deserialized = serializeAndDeserialize(iterator) as any

    expect(deserialized).toSatisfy(isAsyncIteratorObject)
    await expect(deserialized.next()).resolves.toSatisfy(({ value, done }) => {
      expect(done).toBe(false)
      expect(value).toEqual(1)
      expect(getEventMeta(value)).toEqual(undefined)

      return true
    })

    await expect(deserialized.next()).resolves.toSatisfy(({ value, done }) => {
      expect(done).toBe(false)
      expect(value).toEqual({ order: 2, date })
      expect(getEventMeta(value)).toEqual({ retry: 1000 })

      return true
    })

    await expect(deserialized.next()).resolves.toSatisfy(({ value, done }) => {
      expect(done).toBe(true)
      expect(value).toEqual({ order: 3 })
      expect(getEventMeta(value)).toEqual({ id: '123456' })

      return true
    })
  })

  it('on error with ORPCError', async () => {
    const error = withEventMeta(new ORPCError('BAD_GATEWAY', { data: { order: 3 } }), { id: '123456' })

    const iterator = (async function* () {
      yield 1
      yield withEventMeta({ order: 2, date }, { retry: 1000 })
      throw error
    })()

    const deserialized = serializeAndDeserialize(iterator) as any

    expect(deserialized).toSatisfy(isAsyncIteratorObject)
    await expect(deserialized.next()).resolves.toSatisfy(({ value, done }) => {
      expect(done).toBe(false)
      expect(value).toEqual(1)
      expect(getEventMeta(value)).toEqual(undefined)

      return true
    })

    await expect(deserialized.next()).resolves.toSatisfy(({ value, done }) => {
      expect(done).toBe(false)
      expect(value).toEqual({ order: 2, date })
      expect(getEventMeta(value)).toEqual({ retry: 1000 })

      return true
    })

    await expect(deserialized.next()).rejects.toSatisfy((e: any) => {
      expect(e).toEqual(error)
      expect(e).toBeInstanceOf(ORPCError)
      expect(e.cause).toBeInstanceOf(ErrorEvent)

      return true
    })
  })

  it('on error with unknown error when deserialize', async () => {
    const error = withEventMeta(new Error('UNKNOWN'), { id: '123456' })

    const iterator = (async function* () {
      yield serializer.serialize(1)
      yield withEventMeta(serializer.serialize({ order: 2, date }) as any, { retry: 1000 })
      throw error
    })()

    const deserialized = serializer.deserialize(iterator as any) as any

    expect(deserialized).toSatisfy(isAsyncIteratorObject)
    await expect(deserialized.next()).resolves.toSatisfy(({ value, done }) => {
      expect(done).toBe(false)
      expect(value).toEqual(1)
      expect(getEventMeta(value)).toEqual(undefined)

      return true
    })

    await expect(deserialized.next()).resolves.toSatisfy(({ value, done }) => {
      expect(done).toBe(false)
      expect(value).toEqual({ order: 2, date })
      expect(getEventMeta(value)).toEqual({ retry: 1000 })

      return true
    })

    await expect(deserialized.next()).rejects.toSatisfy((e: any) => {
      expect(e).toBe(error)

      return true
    })
  })

  it('deserialize an invalid-ORPCError', async () => {
    const iterator = serializer.deserialize((async function* () {
      throw new ErrorEvent({
        data: { json: { value: 1234 } },
      })
    })()) as any

    await expect(iterator.next()).rejects.toSatisfy((e: any) => {
      expect(e).toBeInstanceOf(ErrorEvent)
      expect(e.data).toEqual({ value: 1234 })

      return true
    })
  })
})
