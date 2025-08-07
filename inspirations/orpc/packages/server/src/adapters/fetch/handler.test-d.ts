import type { FetchHandler } from './handler'

describe('FetchHandler', () => {
  it('optional context when all context is optional', () => {
    const handler = {} as FetchHandler<{ auth?: boolean }>

    handler.handle(new Request('https://example.com'))
    handler.handle(new Request('https://example.com'), { context: { auth: true } })

    const handler2 = {} as FetchHandler<{ auth: boolean }>

    handler2.handle(new Request('https://example.com'), { context: { auth: true } })
    // @ts-expect-error -- context is required
    handler2.handle(new Request('https://example.com'))
  })
})
