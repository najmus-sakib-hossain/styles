import type { StandardHandlerPlugin } from '../standard'
import type { FetchHandlerPlugin } from './plugin'

describe('FetchHandlerPlugin', () => {
  it('backward compatibility', () => {
    expectTypeOf<FetchHandlerPlugin<{ a: string }>>().toMatchTypeOf<StandardHandlerPlugin<{ a: string }>>()
    expectTypeOf<StandardHandlerPlugin<{ a: string }>>().toMatchTypeOf<FetchHandlerPlugin<{ a: string }>>()
  })
})
