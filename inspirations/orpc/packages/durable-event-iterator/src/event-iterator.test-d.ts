import type { Client } from '@orpc/client'
import type { ClientDurableEventIterator } from './client'
import type { DurableEventIteratorObject } from './object'
import { DurableEventIterator } from './event-iterator'

describe('DurableEventIteratorOptions', () => {
  it('optional att if it undefinable', () => {
    interface TestObject extends DurableEventIteratorObject<{ v: string }, { a: string } | undefined> { }

    const iterator1 = new DurableEventIterator<TestObject>('some-room', {
      signingKey: 'key',
    })

    const iterator2 = new DurableEventIterator<TestObject>('some-room', {
      signingKey: 'key',
      att: { a: 'test' },
    })

    const iterator3 = new DurableEventIterator<TestObject>('some-room', {
      signingKey: 'key',
      // @ts-expect-error att is invalid
      att: { a: 123 },
    })
  })

  it('required att if it is not undefinable', () => {
    interface TestObject extends DurableEventIteratorObject<{ v: string }, { a: string }> {}

    const iterator1 = new DurableEventIterator<TestObject>('some-room', {
      signingKey: 'key',
      att: { a: 'test' },
    })

    // @ts-expect-error att is required
    const iterator2 = new DurableEventIterator<TestObject>('some-room', {
      signingKey: 'key',
    })

    const iterator3 = new DurableEventIterator<TestObject>('some-room', {
      signingKey: 'key',
      // @ts-expect-error att is invalid
      att: { a: 123 },
    })
  })

  it('require provide valid rpc methods', () => {
    interface TestObject extends DurableEventIteratorObject<{ v: string }, undefined> {
      rpc: () => Client<object, string, string, Error>
      invalid: 'invalid'
    }

    const iterator1 = new DurableEventIterator<TestObject>('some-room', {
      signingKey: 'key',
    }).rpc('rpc')

    const iterator2 = new DurableEventIterator<TestObject>('some-room', {
      signingKey: 'key',
      // @ts-expect-error rpc is not a valid method
    }).rpc('invalid')
  })

  it('resolve correct client durable event iterator type', async () => {
    interface TestObject extends DurableEventIteratorObject<{ v: string }, { a: string }> {
      rpc: () => Client<object, string, string, Error>
    }

    const iterator1 = await new DurableEventIterator<TestObject>('some-room', {
      signingKey: 'key',
      att: { a: 'test' },
    })

    expectTypeOf(iterator1).toEqualTypeOf<ClientDurableEventIterator<TestObject, never>>()

    const iterator2 = await new DurableEventIterator<TestObject>('some-room', {
      signingKey: 'key',
      att: { a: 'test' },
    }).rpc('rpc')

    expectTypeOf(iterator2).toEqualTypeOf<ClientDurableEventIterator<TestObject, 'rpc'>>()
  })
})
