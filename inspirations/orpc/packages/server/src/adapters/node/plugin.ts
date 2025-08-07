import type { Context } from '../../context'
import type { StandardHandlerPlugin } from '../standard'
import type { NodeHttpHandlerOptions } from './handler'
import { CompositeStandardHandlerPlugin } from '../standard'

export interface NodeHttpHandlerPlugin<T extends Context> extends StandardHandlerPlugin<T> {
  initRuntimeAdapter?(options: NodeHttpHandlerOptions<T>): void
}

export class CompositeNodeHttpHandlerPlugin<T extends Context, TPlugin extends NodeHttpHandlerPlugin<T>>
  extends CompositeStandardHandlerPlugin<T, TPlugin> implements NodeHttpHandlerPlugin<T> {
  initRuntimeAdapter(options: NodeHttpHandlerOptions<T>): void {
    for (const plugin of this.plugins) {
      plugin.initRuntimeAdapter?.(options)
    }
  }
}
