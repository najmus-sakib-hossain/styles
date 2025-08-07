import { toEventIterator as baseToEventIterator } from '@orpc/standard-server-fetch'

export function toEventIterator(
  body: string | undefined,
): AsyncIteratorObject<unknown | void, unknown | void, void> & AsyncGenerator<unknown | void, unknown | void, void> {
  if (body === undefined) {
    return baseToEventIterator(null)
  }

  return baseToEventIterator(
    new ReadableStream<string>({
      pull(controller) {
        controller.enqueue(body)
        controller.close()
      },
    }).pipeThrough(new TextEncoderStream()),
  )
}
