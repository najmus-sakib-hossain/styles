export interface AsyncIdQueueCloseOptions {
  id?: string
  reason?: unknown
}

export class AsyncIdQueue<T> {
  private readonly openIds = new Set<string>()
  private readonly items = new Map<string, T[]>()
  private readonly pendingPulls = new Map<string, (readonly [resolve: (item: T) => void, reject: (err: unknown) => void])[]>()

  get length(): number {
    return this.openIds.size
  }

  open(id: string): void {
    this.openIds.add(id)
  }

  isOpen(id: string): boolean {
    return this.openIds.has(id)
  }

  push(id: string, item: T): void {
    this.assertOpen(id)

    const pending = this.pendingPulls.get(id)

    if (pending?.length) {
      pending.shift()![0](item)

      if (pending.length === 0) {
        this.pendingPulls.delete(id)
      }
    }
    else {
      const items = this.items.get(id)

      if (items) {
        items.push(item)
      }
      else {
        this.items.set(id, [item])
      }
    }
  }

  async pull(id: string): Promise<T> {
    this.assertOpen(id)

    const items = this.items.get(id)

    if (items?.length) {
      const item = items.shift()!

      if (items.length === 0) {
        this.items.delete(id)
      }

      return item
    }

    return new Promise<T>((resolve, reject) => {
      const waitingPulls = this.pendingPulls.get(id)

      const pending = [resolve, reject] as const

      if (waitingPulls) {
        waitingPulls.push(pending)
      }
      else {
        this.pendingPulls.set(id, [pending])
      }
    })
  }

  close({ id, reason }: AsyncIdQueueCloseOptions = {}): void {
    if (id === undefined) {
      this.pendingPulls.forEach((pendingPulls, id) => {
        pendingPulls.forEach(([, reject]) => {
          reject(reason ?? new Error(`[AsyncIdQueue] Queue[${id}] was closed or aborted while waiting for pulling.`))
        })
      })

      this.pendingPulls.clear()
      this.openIds.clear()
      this.items.clear()
      return
    }

    this.pendingPulls.get(id)?.forEach(([, reject]) => {
      reject(reason ?? new Error(`[AsyncIdQueue] Queue[${id}] was closed or aborted while waiting for pulling.`))
    })

    this.pendingPulls.delete(id)
    this.openIds.delete(id)
    this.items.delete(id)
  }

  assertOpen(id: string): void {
    if (!this.isOpen(id)) {
      throw new Error(`[AsyncIdQueue] Cannot access queue[${id}] because it is not open or aborted.`)
    }
  }
}
