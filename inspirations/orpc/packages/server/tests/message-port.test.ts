import type { RouterClient } from '../src'
import { createORPCClient } from '@orpc/client'
import { RPCLink } from '@orpc/client/message-port'
import { supportedDataTypes } from '../../client/tests/shared'
import { os } from '../src'
import { RPCHandler } from '../src/adapters/message-port'

describe('message port adapter', () => {
  const { port1, port2 } = new MessageChannel()

  const procedure = os.handler(({ input }) => input)

  const handler = new RPCHandler(procedure)
  handler.upgrade(port1)

  const link = new RPCLink({
    port: port2,
  })

  const client: RouterClient<typeof procedure> = createORPCClient(link)

  it.each(supportedDataTypes)('supports $name', async ({ value, expected }) => {
    expect(await client(value)).toEqual(expected)
  })

  it.each(supportedDataTypes)('supports $name  on complex object', async ({ value, expected }) => {
    expect(await client({
      value: [value],
    })).toEqual({
      value: [expected],
    })
  })
})
