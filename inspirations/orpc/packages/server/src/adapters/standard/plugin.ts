import type { Context } from '../../context'
import type { Router } from '../../router'
import type { StandardHandlerOptions } from './handler'

export interface StandardHandlerPlugin<T extends Context> {
  order?: number
  init?(options: StandardHandlerOptions<T>, router: Router<any, T>): void
}

export class CompositeStandardHandlerPlugin<T extends Context, TPlugin extends StandardHandlerPlugin<T>> implements StandardHandlerPlugin<T> {
  protected readonly plugins: TPlugin[]

  constructor(plugins: readonly TPlugin[] = []) {
    this.plugins = [...plugins].sort((a, b) => (a.order ?? 0) - (b.order ?? 0))
  }

  init(options: StandardHandlerOptions<T>, router: Router<any, T>): void {
    for (const plugin of this.plugins) {
      plugin.init?.(options, router)
    }
  }
}
