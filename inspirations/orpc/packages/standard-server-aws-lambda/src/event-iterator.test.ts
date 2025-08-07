import { isAsyncIteratorObject } from '@orpc/shared'
import { toEventIterator } from './event-iterator'

describe('toEventIterator', () => {
  it('works on string', async () => {
    const generator = toEventIterator(
      'event: message\ndata: 1\n\n'
      + 'event: message\ndata: 2\n\n'
      + 'event: done\ndata: 3\n\n',
    )

    expect(generator).toSatisfy(isAsyncIteratorObject)
    expect(await generator.next()).toEqual({ done: false, value: 1 })
    expect(await generator.next()).toEqual({ done: false, value: 2 })
    expect(await generator.next()).toEqual({ done: true, value: 3 })
  })

  it('works on undefined', async () => {
    const generator = toEventIterator(undefined)
    expect(generator).toSatisfy(isAsyncIteratorObject)
    expect(await generator.next()).toEqual({ done: true, value: undefined })
  })
})
