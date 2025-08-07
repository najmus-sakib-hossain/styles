import { getEventMeta, withEventMeta } from '@orpc/server'
import { createDurableObjectState } from '../../tests/shared'
import { DurableEventIteratorObjectEventStorage } from './event-storage'

describe('durableEventIteratorObjectEventStorage', () => {
  describe('.storeEvent', () => {
    it('should store events and return with id', () => {
      const ctx = createDurableObjectState()
      const storage = new DurableEventIteratorObjectEventStorage(ctx)
      const event = { foo: 'bar' }

      const storedEvent = storage.storeEvent(event)
      expect(storedEvent).toEqual(event)
      expect(storedEvent).not.toBe(event)
      expect(getEventMeta(storedEvent)).toEqual({ id: '1' })

      // respect current meta, but override id
      const event2 = withEventMeta({ foo: 'bar' }, { id: 'something', retry: 2000, comments: ['a'] })
      const storedEvent2 = storage.storeEvent(event2)
      expect(storedEvent2).toEqual(event2)
      expect(storedEvent2).not.toBe(event2)
      expect(getEventMeta(storedEvent2)).toEqual({ id: '2', retry: 2000, comments: ['a'] })

      expect(ctx.storage.sql.exec('SELECT * FROM "dei:events"').toArray()).toHaveLength(2)
    })

    it('should delete old events', () => {
      vi.useFakeTimers()

      const date = new Date()
      vi.setSystemTime(date)

      const ctx = createDurableObjectState()

      const storage = new DurableEventIteratorObjectEventStorage(ctx, {
        eventRetentionSeconds: 100,
      })

      const event = { foo: 'bar' }
      storage.storeEvent(event)
      storage.storeEvent(event)
      expect(ctx.storage.sql.exec('SELECT * FROM "dei:events"').toArray()).toHaveLength(2)

      vi.advanceTimersByTime(101_000)
      storage.storeEvent(event)
      expect(ctx.storage.sql.exec('SELECT * FROM "dei:events"').toArray()).toHaveLength(1)

      vi.useRealTimers()
    })

    it('auto resets schema if disk is full', () => {
      const ctx = createDurableObjectState()
      const storage = new DurableEventIteratorObjectEventStorage(ctx)

      // Simulate a full disk (1 row remaining) by exceeding the max number of rows
      ctx.storage.sql.exec(`
        INSERT INTO "dei:events" (id, event, time) VALUES (?, ?, ?) 
        RETURNING CAST(id AS TEXT) as id
      `, '9223372036854775806', '{}', Math.floor(Date.now() / 1000))

      const event = { foo: 'bar' }
      expect(getEventMeta(storage.storeEvent(event))).toEqual({ id: '9223372036854775807' })

      // auto reset schema
      expect(getEventMeta(storage.storeEvent(event))).toEqual({ id: '1' })
    })
  })

  describe('.getEventsAfter', () => {
    it('should return events after a specific id', () => {
      const ctx = createDurableObjectState()
      const storage = new DurableEventIteratorObjectEventStorage(ctx)

      const event1 = { foo: 'bar1' }
      const event2 = { foo: 'baz2' }
      const event3 = withEventMeta({ foo: 'baz3' }, { comments: ['comment'] })
      storage.storeEvent(event1)
      storage.storeEvent(event2)
      storage.storeEvent(event3)

      const events = storage.getEventsAfter('1')
      expect(events).toEqual([event2, event3])
      expect(getEventMeta(events[0])).toEqual({ id: '2' })
      expect(getEventMeta(events[1])).toEqual({ id: '3', comments: ['comment'] })
    })

    it('should return events after a specific date', () => {
      vi.useFakeTimers()

      const date = new Date()
      vi.setSystemTime(date)

      const ctx = createDurableObjectState()
      const storage = new DurableEventIteratorObjectEventStorage(ctx)

      const event1 = { foo: 'bar1' }
      storage.storeEvent(event1)

      vi.advanceTimersByTime(1000)
      const event2 = { foo: 'baz2' }
      storage.storeEvent(event2)

      vi.advanceTimersByTime(1000)
      const event3 = withEventMeta({ foo: 'baz3' }, { comments: ['comment'] })
      storage.storeEvent(event3)

      const events = storage.getEventsAfter(date)
      expect(events).toHaveLength(2)
      expect(events).toEqual([event2, event3])
      expect(getEventMeta(events[0])).toEqual({ id: '2' })
      expect(getEventMeta(events[1])).toEqual({ id: '3', comments: ['comment'] })

      vi.useRealTimers()
    })
  })
})
