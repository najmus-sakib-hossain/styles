import { AsyncIteratorClass } from './iterator'

export function streamToAsyncIteratorClass<T>(
  stream: ReadableStream<T>,
): AsyncIteratorClass<T> {
  const reader = stream.getReader()

  return new AsyncIteratorClass<T>(
    async () => {
      return reader.read() as Promise<IteratorResult<T>>
    },
    async () => {
      await reader.cancel()
    },
  )
}

export function asyncIteratorToStream<T>(
  iterator: AsyncIterator<T>,
): ReadableStream<T> {
  return new ReadableStream<T>({
    async pull(controller) {
      const { done, value } = await iterator.next()

      if (done) {
        controller.close()
      }
      else {
        controller.enqueue(value)
      }
    },
    async cancel() {
      await iterator.return?.()
    },
  })
}
