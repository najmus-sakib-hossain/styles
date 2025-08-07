import type { Client } from '@orpc/client'
import type { AsyncIteratorClass } from '@orpc/shared'
import type { DurableEventIteratorObject } from '../object'
import type { ClientDurableEventIterator, ClientDurableEventIteratorRpcContext } from './event-iterator'

it('ClientDurableEventIterator', () => {
  interface SomeObject extends DurableEventIteratorObject<{ v: string }, { token: string }> {
    sendMessage: (ws: WebSocket) => Client<object, string, string, Error>
  }

  type ClientIterator = ClientDurableEventIterator<SomeObject, 'sendMessage'>

  expectTypeOf<ClientIterator>().toExtend<AsyncIteratorClass<{ v: string }>>()

  expectTypeOf<ClientIterator['sendMessage']>().toEqualTypeOf<
    Client<ClientDurableEventIteratorRpcContext, string, string, Error>
  >()
})
