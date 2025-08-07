import type { ClientContext } from '../../types'
import type { StandardLinkOptions } from './link'

export interface StandardLinkPlugin<T extends ClientContext> {
  order?: number
  init?(options: StandardLinkOptions<T>): void
}

export class CompositeStandardLinkPlugin<T extends ClientContext, TPlugin extends StandardLinkPlugin<T>> implements StandardLinkPlugin<T> {
  protected readonly plugins: TPlugin[]

  constructor(plugins: readonly TPlugin[] = []) {
    this.plugins = [...plugins].sort((a, b) => (a.order ?? 0) - (b.order ?? 0))
  }

  init(options: StandardLinkOptions<T>): void {
    for (const plugin of this.plugins) {
      plugin.init?.(options)
    }
  }
}
