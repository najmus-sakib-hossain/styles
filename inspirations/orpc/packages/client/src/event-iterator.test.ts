import { getEventMeta, withEventMeta } from '@orpc/standard-server'
import { mapEventIterator } from './event-iterator'

describe('mapEventIterator', () => {
  it('on success', async () => {
    let finished = false

    const iterator = (async function* () {
      try {
        yield 1
        yield { order: 2 }
        yield withEventMeta({ order: 3 }, { id: 'id-3' })
        return withEventMeta({ order: 4 }, { retry: 4000 })
      }
      finally {
        finished = true
      }
    })()

    const map = vi.fn(async v => ({ mapped: v }))

    const mapped = mapEventIterator(iterator, {
      error: map,
      value: map,
    })

    await expect(mapped.next()).resolves.toSatisfy(({ done, value }) => {
      expect(done).toBe(false)
      expect(value).toEqual({ mapped: 1 })
      expect(getEventMeta(value)).toEqual(undefined)

      return true
    })

    expect(map).toHaveBeenCalledTimes(1)
    expect(map).toHaveBeenLastCalledWith(1, false)

    await expect(mapped.next()).resolves.toSatisfy(({ done, value }) => {
      expect(done).toBe(false)
      expect(value).toEqual({ mapped: { order: 2 } })
      expect(getEventMeta(value)).toEqual(undefined)

      return true
    })

    expect(map).toHaveBeenCalledTimes(2)
    expect(map).toHaveBeenLastCalledWith({ order: 2 }, false)

    await expect(mapped.next()).resolves.toSatisfy(({ done, value }) => {
      expect(done).toBe(false)
      expect(value).toEqual({ mapped: { order: 3 } })
      expect(getEventMeta(value)).toEqual({ id: 'id-3' })

      return true
    })

    expect(map).toHaveBeenCalledTimes(3)
    expect(map).toHaveBeenLastCalledWith({ order: 3 }, false)

    await expect(mapped.next()).resolves.toSatisfy(({ done, value }) => {
      expect(done).toBe(true)
      expect(value).toEqual({ mapped: { order: 4 } })
      expect(getEventMeta(value)).toEqual({ retry: 4000 })

      return true
    })

    expect(map).toHaveBeenCalledTimes(4)
    expect(map).toHaveBeenLastCalledWith({ order: 4 }, true)

    expect(finished).toBe(true)
  })

  it('on error', async () => {
    let finished = false
    const error = withEventMeta(new Error('TEST'), { id: 'error-1' })

    const iterator = (async function* () {
      try {
        throw error
      }
      finally {
        finished = true
      }
    })()

    const map = vi.fn(async v => ({ mapped: v }))

    const mapped = mapEventIterator(iterator, {
      error: map,
      value: map,
    })

    await expect(mapped.next()).rejects.toSatisfy((e) => {
      expect(e).toEqual({ mapped: error })
      expect(getEventMeta(e)).toEqual({ id: 'error-1' })

      return true
    })

    expect(map).toHaveBeenCalledTimes(1)
    expect(map).toHaveBeenLastCalledWith(error)

    expect(finished).toBe(true)
  })

  it('cancel original when .return is called', async () => {
    let finished = false

    const iterator = (async function* () {
      try {
        yield 1
        yield 2
      }
      finally {
        finished = true
      }
    })()

    const map = vi.fn(async v => ({ mapped: v }))

    const mapped = mapEventIterator(iterator, {
      error: map,
      value: map,
    })

    await mapped.next()
    await mapped.return({} as any)

    expect(map).toHaveBeenCalledTimes(1)
    expect(finished).toBe(true)
  })

  it('cancel original when .throw is called', async () => {
    let finished = false

    const iterator = (async function* () {
      try {
        yield 1
        yield 2
      }
      finally {
        finished = true
      }
    })()

    const map = vi.fn(async v => ({ mapped: v }))

    const mapped = mapEventIterator(iterator, {
      error: map,
      value: map,
    })

    await mapped.next()
    await expect(mapped.throw(new Error('TEST'))).rejects.toThrow()
    expect(finished).toBe(true)
  })

  it('cancel original when error is thrown in value map', async () => {
    let finished = false

    const iterator = (async function* () {
      try {
        yield 1
        yield 2
      }
      finally {
        finished = true
      }
    })()

    const map = vi.fn(async (v) => {
      if (v === 2) {
        throw new Error('TEST')
      }
      return { mapped: v }
    })

    const mapped = mapEventIterator(iterator, {
      value: map,
      error: async error => error,
    })

    await expect(mapped.next()).resolves.toEqual({ done: false, value: { mapped: 1 } })
    await expect(mapped.next()).rejects.toThrow('TEST')

    expect(finished).toBe(true)
  })
})
