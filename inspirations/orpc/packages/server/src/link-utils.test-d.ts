import { RPCLink } from '@orpc/client/fetch'
import { router } from '../tests/shared'
import { inferRPCMethodFromRouter } from './link-utils'

it('inferRPCMethodFromContractRouter', () => {
  const link = new RPCLink({
    url: 'http://localhost:3000/rpc',
    method: inferRPCMethodFromRouter(router),
  })
})
