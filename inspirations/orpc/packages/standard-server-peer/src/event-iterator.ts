import type { AsyncIteratorClassCleanupFn } from '@orpc/shared'
import type { AsyncIdQueue } from '../../shared/src/queue'
import type { EventIteratorPayload } from './codec'
import { AsyncIteratorClass, isTypescriptObject } from '@orpc/shared'
import { ErrorEvent, getEventMeta, withEventMeta } from '@orpc/standard-server'

export function toEventIterator(
  queue: AsyncIdQueue<EventIteratorPayload>,
  id: string,
  cleanup: AsyncIteratorClassCleanupFn,
): AsyncIteratorClass<unknown> {
  return new AsyncIteratorClass(async () => {
    const item = await queue.pull(id)

    switch (item.event) {
      case 'message': {
        let data = item.data

        if (item.meta && isTypescriptObject(data)) {
          data = withEventMeta(data, item.meta)
        }

        return { value: data, done: false }
      }

      case 'error': {
        let error = new ErrorEvent({
          data: item.data,
        })

        if (item.meta) {
          error = withEventMeta(error, item.meta)
        }

        throw error
      }

      case 'done': {
        let data = item.data

        if (item.meta && isTypescriptObject(data)) {
          data = withEventMeta(data, item.meta)
        }

        return { value: data, done: true }
      }
    }
  }, cleanup)
}

export async function resolveEventIterator(
  iterator: AsyncIterator<any>,
  callback: (payload: EventIteratorPayload) => Promise<'next' | 'abort'>,
): Promise<void> {
  while (true) {
    const payload: EventIteratorPayload = await (async () => {
      try {
        const { value, done } = await iterator.next()

        if (done) {
          return { event: 'done', data: value, meta: getEventMeta(value) }
        }

        return { event: 'message', data: value, meta: getEventMeta(value) }
      }
      catch (err) {
        return {
          meta: getEventMeta(err),
          event: 'error',
          data: err instanceof ErrorEvent ? err.data : undefined,
        }
      }
    })()

    try {
      const direction = await callback(payload)

      if (payload.event === 'done' || payload.event === 'error') {
        return
      }

      if (direction === 'abort') {
        try {
          await iterator.return?.()
        }
        catch { }

        return
      }
    }
    catch (err) {
      try {
        await iterator.return?.()
      }
      catch { }

      throw err
    }
  }
}
