import type { APIEvent } from '@solidjs/start/server'
import { RPCHandler } from '@orpc/server/fetch'
import { router } from '~/router'
import { onError } from '@orpc/server'
import '~/polyfill'

const handler = new RPCHandler(router, {
  interceptors: [
    onError((error) => {
      console.error(error)
    }),
  ],
})

async function handle({ request }: APIEvent) {
  const context = { user: { id: 'test', name: 'John Doe', email: 'john@doe.com' } }

  const { response } = await handler.handle(request, {
    prefix: '/rpc',
    context,
  })

  return response ?? new Response('Not Found', { status: 404 })
}

export const HEAD = handle
export const GET = handle
export const POST = handle
export const PUT = handle
export const PATCH = handle
export const DELETE = handle
