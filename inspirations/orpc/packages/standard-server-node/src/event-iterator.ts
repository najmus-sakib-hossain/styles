import type { ToEventStreamOptions as BaseToEventStreamOptions } from '@orpc/standard-server-fetch'
import { Readable } from 'node:stream'
import {
  toEventIterator as baseToEventIterator,
  toEventStream as baseToEventStream,
} from '@orpc/standard-server-fetch'

export function toEventIterator(
  stream: Readable,
): AsyncIteratorObject<unknown | void, unknown | void, void> & AsyncGenerator<unknown | void, unknown | void, void> {
  return baseToEventIterator(Readable.toWeb(stream))
}

export interface ToEventStreamOptions extends BaseToEventStreamOptions {}

export function toEventStream(
  iterator: AsyncIterator<unknown | void, unknown | void, void>,
  options: ToEventStreamOptions = {},
): Readable {
  return Readable.fromWeb(baseToEventStream(iterator, options))
}
