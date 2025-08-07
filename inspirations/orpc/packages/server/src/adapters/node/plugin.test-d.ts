import type { StandardHandlerPlugin } from '../standard'
import type { NodeHttpHandlerPlugin } from './plugin'

describe('NodeHttpHandlerPlugin', () => {
  it('backward compatibility', () => {
    expectTypeOf<NodeHttpHandlerPlugin<{ a: string }>>().toMatchTypeOf<StandardHandlerPlugin<{ a: string }>>()
    expectTypeOf<StandardHandlerPlugin<{ a: string }>>().toMatchTypeOf<NodeHttpHandlerPlugin<{ a: string }>>()
  })
})
