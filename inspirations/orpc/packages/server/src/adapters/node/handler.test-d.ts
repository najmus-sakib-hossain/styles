import type { IncomingMessage, ServerResponse } from 'node:http'
import type { NodeHttpHandler } from './handler'

describe('NodeHttpHandler', () => {
  it('optional context when all context is optional', () => {
    const handler = {} as NodeHttpHandler<{ auth?: boolean }>

    handler.handle({} as IncomingMessage, {} as ServerResponse)
    handler.handle({} as IncomingMessage, {} as ServerResponse, { context: { auth: true } })

    const handler2 = {} as NodeHttpHandler<{ auth: boolean }>

    handler2.handle({} as IncomingMessage, {} as ServerResponse, { context: { auth: true } })
    // @ts-expect-error -- context is required
    handler2.handle({} as IncomingMessage, {} as ServerResponse)
  })
})
