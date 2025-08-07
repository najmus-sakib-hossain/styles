import { RPCLink } from '@orpc/client/fetch'
import { router as contract } from '../tests/shared'
import { inferRPCMethodFromContractRouter } from './link-utils'

it('inferRPCMethodFromContractRouter', () => {
  const link = new RPCLink({
    url: 'http://localhost:3000/rpc',
    method: inferRPCMethodFromContractRouter(contract),
  })
})
