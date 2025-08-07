import { AsyncIteratorClass } from '@orpc/shared'

export interface experimental_HibernationEventIteratorCallback {
  (id: string): void
}

export class experimental_HibernationEventIterator<T, TReturn = unknown, TNext = unknown> extends AsyncIteratorClass<T, TReturn, TNext> {
  /**
   * this property is not transferred to the client, so it should be optional for type safety
   */
  public readonly hibernationCallback?: experimental_HibernationEventIteratorCallback

  constructor(
    hibernationCallback: experimental_HibernationEventIteratorCallback,
  ) {
    super(async () => {
      throw new Error('Cannot iterate over hibernating iterator directly')
    }, async (reason) => {
      if (reason !== 'next') {
        throw new Error('Cannot cleanup hibernating iterator directly')
      }
    })

    this.hibernationCallback = hibernationCallback
  }
}
