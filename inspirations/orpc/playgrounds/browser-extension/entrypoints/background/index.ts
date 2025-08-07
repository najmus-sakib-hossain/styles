import { RPCHandler } from '@orpc/server/message-port'
import { router } from './router'

const handler = new RPCHandler(router)

export default defineBackground(() => {
  browser.runtime.onConnect.addListener((port) => {
    handler.upgrade(port)
  })
})
