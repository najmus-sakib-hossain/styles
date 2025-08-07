import type { StandardRPCJsonSerializerOptions } from '@orpc/client/standard'
import { StandardRPCJsonSerializer } from '@orpc/client/standard'
import { getEventMeta, withEventMeta } from '@orpc/server'
import { stringifyJSON } from '@orpc/shared'

export interface DurableEventIteratorObjectEventStorageOptions extends StandardRPCJsonSerializerOptions {
  /**
   * The number of seconds to retain events in the storage.
   * Used for sending missing events while the client connects/reconnects connection estimated.
   *
   * @default 300 (5 minutes)
   */
  eventRetentionSeconds?: number

  /**
   * Prefix for the event retention schema.
   * This is used to avoid conflicts with other schemas in the same Durable Object.
   * @default 'dei:'
   */
  eventRetentionSchemaPrefix?: string
}

export class DurableEventIteratorObjectEventStorage<TEventPayload extends object> {
  private readonly serializer: StandardRPCJsonSerializer
  private readonly eventRetentionSeconds: number
  private readonly eventRetentionSchemaPrefix: string

  constructor(
    private readonly ctx: DurableObjectState,
    options: DurableEventIteratorObjectEventStorageOptions = {},
  ) {
    this.eventRetentionSeconds = options.eventRetentionSeconds ?? 60 * 5 // 5 minutes
    this.eventRetentionSchemaPrefix = options.eventRetentionSchemaPrefix ?? 'dei:'
    this.serializer = new StandardRPCJsonSerializer(options)

    this.initSchema()
  }

  private initSchema(): void {
    this.ctx.storage.sql.exec(`
      CREATE TABLE IF NOT EXISTS "${this.eventRetentionSchemaPrefix}events" (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        event TEXT NOT NULL,
        time INTEGER NOT NULL
      )
    `)

    this.ctx.storage.sql.exec(`
      CREATE INDEX IF NOT EXISTS "${this.eventRetentionSchemaPrefix}idx_event_id" ON "${this.eventRetentionSchemaPrefix}events" (id)
    `)

    this.ctx.storage.sql.exec(`
      CREATE INDEX IF NOT EXISTS "${this.eventRetentionSchemaPrefix}idx_event_time" ON "${this.eventRetentionSchemaPrefix}events" (time)
    `)
  }

  private resetSchema(): void {
    this.ctx.storage.sql.exec(`
      DROP TABLE IF EXISTS "${this.eventRetentionSchemaPrefix}events"
    `)

    this.initSchema()
  }

  private serializeEvent(payload: TEventPayload): string {
    const eventMeta = getEventMeta(payload)
    const [json, meta] = this.serializer.serialize({ payload, meta: eventMeta })
    return stringifyJSON({ json, meta })
  }

  private deserializeEvent(serialized: string): TEventPayload {
    const { json, meta } = JSON.parse(serialized)
    const { payload, meta: eventMeta } = this.serializer.deserialize(json, meta) as {
      payload: TEventPayload
      meta: ReturnType<typeof getEventMeta>
    }

    return eventMeta ? withEventMeta(payload, eventMeta) : payload
  }

  storeEvent(
    payload: TEventPayload,
  ): TEventPayload {
    const serialized = this.serializeEvent(payload)
    const now = Math.floor(Date.now() / 1000)

    this.ctx.storage.sql.exec(`
      DELETE FROM "${this.eventRetentionSchemaPrefix}events" WHERE time < ?
    `, now - this.eventRetentionSeconds)

    const insertEvent = () => {
      /**
       * Sqlite INTEGER can be out of safe range for JavaScript,
       * so we use TEXT to store the ID.
       */
      const result = this.ctx.storage.sql.exec(`
        INSERT INTO "${this.eventRetentionSchemaPrefix}events" (event, time) VALUES (?, ?) 
        RETURNING CAST(id AS TEXT) as id
      `, serialized, now)

      const insertedId = result.one()?.id as string

      return withEventMeta(payload, {
        ...getEventMeta(payload),
        id: insertedId,
      })
    }

    try {
      return insertEvent()
    }
    catch {
      /**
       * In the error case, like full disk, exceeding the max number of rows, etc.,
       * we reset the schema and try to insert again.
       * This can lead to data loss, but it's better than failing the entire operation.
       */
      this.resetSchema()
      return insertEvent()
    }
  }

  /**
   * Retrieves all events after a specific event id or stored date.
   */
  getEventsAfter(
    after: string | Date,
  ): TEventPayload[] {
    /**
     * Sqlite INTEGER can be out of safe range for JavaScript,
     * so we use TEXT to store the ID.
     */
    const result = this.ctx.storage.sql.exec(`
      SELECT CAST(id AS TEXT) as id, event
      FROM "${this.eventRetentionSchemaPrefix}events"
      WHERE ${typeof after === 'string' ? 'id' : 'time'} > ?
      ORDER BY id ASC
    `, typeof after === 'string' ? after : Math.floor(after.getTime() / 1000))

    return result.toArray().map((row: Record<string, any>) => {
      const event = this.deserializeEvent(row.event)
      return withEventMeta(event, { ...getEventMeta(event), id: row.id })
    })
  }
}
