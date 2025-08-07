import type { StandardRPCCustomJsonSerializer } from '@orpc/client/standard'
import { ORPCError } from '@orpc/client'
import { StandardRPCJsonSerializer, StandardRPCSerializer } from '@orpc/client/standard'
import { withEventMeta } from '@orpc/standard-server'
import { encodeResponseMessage, MessageType } from '@orpc/standard-server-peer'
import { experimental_encodeHibernationRPCEvent as encodeHibernationRPCEvent } from './event-iterator'

class Planet {
  constructor(public readonly name: string, public readonly diameter: number) {}
}

const planetSerializer: StandardRPCCustomJsonSerializer = {
  type: 21,
  condition: value => value instanceof Planet,
  serialize: value => [value.name, value.diameter],
  deserialize: ([name, diameter]) => new Planet(name, diameter),
}

const serializer = new StandardRPCSerializer(new StandardRPCJsonSerializer({
  customJsonSerializers: [planetSerializer],
}))

describe('encodeHibernationRPCEvent', () => {
  it('message without meta', async () => {
    const id = '39483'
    const planet = 'hello world'
    const encoded = encodeHibernationRPCEvent(id, planet, {
      customJsonSerializers: [planetSerializer],
    })

    expect(encoded).toEqual(
      await encodeResponseMessage(id, MessageType.EVENT_ITERATOR, { event: 'message', data: serializer.serialize('hello world') }),
    )
  })

  it('message with meta', async () => {
    const id = '39483'
    const planet = withEventMeta(new Planet('Earth', 12345), { retry: 400 })
    const encoded = encodeHibernationRPCEvent(id, planet, {
      customJsonSerializers: [planetSerializer],
    })

    expect(encoded).toEqual(
      await encodeResponseMessage(id, MessageType.EVENT_ITERATOR, { event: 'message', data: serializer.serialize(planet), meta: { retry: 400 } }),
    )
  })

  it('done', async () => {
    const id = '39483'
    const planet = withEventMeta(new Planet('Earth', 12345), { retry: 400 })
    const encoded = encodeHibernationRPCEvent(id, planet, {
      customJsonSerializers: [planetSerializer],
      event: 'done',
    })

    expect(encoded).toEqual(
      await encodeResponseMessage(id, MessageType.EVENT_ITERATOR, { event: 'done', data: serializer.serialize(planet), meta: { retry: 400 } }),
    )
  })

  it('error', async () => {
    const id = '39483'
    const planet = withEventMeta(new ORPCError('BAD_GATEWAY', { data: '__TEST__' }), { retry: 400 })
    const encoded = encodeHibernationRPCEvent(id, planet, {
      customJsonSerializers: [planetSerializer],
      event: 'error',
    })

    expect(encoded).toEqual(
      await encodeResponseMessage(id, MessageType.EVENT_ITERATOR, { event: 'error', data: serializer.serialize(planet.toJSON()), meta: { retry: 400 } }),
    )
  })
})
