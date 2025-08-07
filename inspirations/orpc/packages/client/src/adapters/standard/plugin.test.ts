import type { StandardLinkPlugin } from './plugin'
import { CompositeStandardLinkPlugin } from './plugin'

describe('compositeStandardLinkPlugin', () => {
  it('forward init and sort plugins', () => {
    const plugin1 = {
      init: vi.fn(),
      order: 1,
    } satisfies StandardLinkPlugin<any>
    const plugin2 = {
      init: vi.fn(),
    } satisfies StandardLinkPlugin<any>
    const plugin3 = {
      init: vi.fn(),
      order: -1,
    } satisfies StandardLinkPlugin<any>

    const compositePlugin = new CompositeStandardLinkPlugin([plugin1, plugin2, plugin3])

    const interceptor = vi.fn()

    const options = { interceptors: [interceptor] }

    compositePlugin.init(options)

    expect(plugin1.init).toHaveBeenCalledOnce()
    expect(plugin2.init).toHaveBeenCalledOnce()
    expect(plugin3.init).toHaveBeenCalledOnce()

    expect(plugin1.init.mock.calls[0]![0]).toBe(options)
    expect(plugin2.init.mock.calls[0]![0]).toBe(options)
    expect(plugin3.init.mock.calls[0]![0]).toBe(options)

    expect(plugin3.init).toHaveBeenCalledBefore(plugin2.init)
    expect(plugin2.init).toHaveBeenCalledBefore(plugin1.init)
  })
})
