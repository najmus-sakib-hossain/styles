import type { NestedClient } from '@orpc/client'
import type { AsyncIteratorClass, JsonValue } from '@orpc/shared'

export const DURABLE_EVENT_ITERATOR_OBJECT_SYMBOL: unique symbol = Symbol('ORPC_DURABLE_EVENT_ITERATOR_OBJECT')

export type TokenAttachment = JsonValue | undefined

export interface DurableEventIteratorObject<
  TEventPayload extends object,
  TTokenAttachment extends TokenAttachment = TokenAttachment,
> {
  [DURABLE_EVENT_ITERATOR_OBJECT_SYMBOL]?: {
    eventPayload: TEventPayload
    tokenAttachment: TTokenAttachment
  }
}

export type InferDurableEventIteratorObjectRPC<
  T extends DurableEventIteratorObject<any, any>,
> = Exclude<{
  [K in keyof T]: T[K] extends ((...args: any[]) => NestedClient<object>)
    ? K
    : never
}[keyof T], keyof AsyncIteratorClass<any>> & string
