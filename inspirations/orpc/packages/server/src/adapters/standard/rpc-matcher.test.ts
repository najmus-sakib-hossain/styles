import { router as contract } from '../../../../contract/tests/shared'
import { ping, pong, router } from '../../../tests/shared'
import { os } from '../../builder'
import { implement } from '../../implementer'
import { unlazy } from '../../lazy'
import { Procedure } from '../../procedure'
import { StandardRPCMatcher } from './rpc-matcher'

describe('standardRPCMatcher', () => {
  it('with router', async () => {
    const rpcMatcher = new StandardRPCMatcher()
    rpcMatcher.init(router)

    expect(await rpcMatcher.match('ANYTHING', '/ping')).toEqual({
      path: ['ping'],
      procedure: ping,
    })

    expect(await rpcMatcher.match('ANYTHING', '/nested/ping')).toEqual({
      path: ['nested', 'ping'],
      procedure: ping,
    })

    expect(await rpcMatcher.match('ANYTHING', '/pong')).toEqual({
      path: ['pong'],
      procedure: pong,
    })

    expect(await rpcMatcher.match('ANYTHING', '/nested/pong')).toEqual({
      path: ['nested', 'pong'],
      procedure: pong,
    })

    expect(await rpcMatcher.match('ANYTHING', '/')).toEqual(undefined)
    expect(await rpcMatcher.match('ANYTHING', '/not_found')).toEqual(undefined)
  })

  it('with implemented router', async () => {
    const rpcMatcher = new StandardRPCMatcher()
    rpcMatcher.init(implement(contract).$context<any>().router({
      ...router,
      pong: new Procedure({
        ...pong['~orpc'],
        errorMap: {
          SOMETHING_THAT_VIOLATES_THE_CONTRACT: {},
        },
        meta: {
          SOMETHING_THAT_VIOLATES_THE_CONTRACT: {},
        },
        route: {
          path: '/SOMETHING_THAT_VIOLATES_THE_CONTRACT',
        },
      }),
    }))

    expect(await rpcMatcher.match('ANYTHING', '/ping')).toEqual({
      path: ['ping'],
      procedure: ping,
    })

    expect(await rpcMatcher.match('ANYTHING', '/nested/ping')).toEqual({
      path: ['nested', 'ping'],
      procedure: ping,
    })

    expect(await rpcMatcher.match('ANYTHING', '/pong')).toEqual({
      path: ['pong'],
      procedure: pong, // this mean the contract is applied to the procedure
    })

    expect(await rpcMatcher.match('ANYTHING', '/nested/pong')).toEqual({
      path: ['nested', 'pong'],
      procedure: pong,
    })

    expect(await rpcMatcher.match('ANYTHING', '/')).toEqual(undefined)
    expect(await rpcMatcher.match('ANYTHING', '/not_found')).toEqual(undefined)
  })

  it('with missing implementation', async () => {
    const rpcMatcher = new StandardRPCMatcher()
    rpcMatcher.init(implement(contract).$context<any>().router({
      ...router,
      pong: undefined as any, // missing here
    }))

    // still work normally with other implementation
    expect(await rpcMatcher.match('ANYTHING', '/ping')).toEqual({
      path: ['ping'],
      procedure: ping,
    })

    expect(await rpcMatcher.match('ANYTHING', '/nested/ping')).toEqual({
      path: ['nested', 'ping'],
      procedure: ping,
    })

    expect(rpcMatcher.match('ANYTHING', '/pong')).rejects.toThrowError()

    expect(await rpcMatcher.match('ANYTHING', '/nested/pong')).toEqual({
      path: ['nested', 'pong'],
      procedure: pong,
    })

    expect(await rpcMatcher.match('ANYTHING', '/')).toEqual(undefined)
    expect(await rpcMatcher.match('ANYTHING', '/not_found')).toEqual(undefined)
  })

  it('lazy load lazy router', async () => {
    const pingLoader = vi.fn(() => Promise.resolve({ default: ping }))
    const pongLoader = vi.fn(() => Promise.resolve({ default: pong }))

    const rpcMatcher = new StandardRPCMatcher()

    const base = os.$context<any>()

    const router = base.router({
      ping: base.lazy(pingLoader),
      pong: base.lazy(pongLoader),
      nested: base.router({
        ping: base.lazy(pingLoader),
        pong: base.lazy(pongLoader),
      }),
    })

    rpcMatcher.init(router)

    expect(await rpcMatcher.match('POST', '/ping')).toEqual({
      path: ['ping'],
      procedure: (await unlazy(router.ping)).default,
    })

    expect(pingLoader).toHaveBeenCalledTimes(2)
    expect(pongLoader).toHaveBeenCalledTimes(0)

    // mean the result is cached
    expect(await rpcMatcher.match('POST', '/ping')).not.toBeUndefined()
    expect(pingLoader).toHaveBeenCalledTimes(2)
    expect(pongLoader).toHaveBeenCalledTimes(0)

    expect(await rpcMatcher.match('POST', '/pong')).toEqual({
      path: ['pong'],
      procedure: (await unlazy(router.pong)).default,
    })

    expect(pingLoader).toHaveBeenCalledTimes(2)
    expect(pongLoader).toHaveBeenCalledTimes(2)

    expect(await rpcMatcher.match('POST', '/nested/ping')).toEqual({
      path: ['nested', 'ping'],
      procedure: (await unlazy(router.nested.ping)).default,
    })

    expect(pingLoader).toHaveBeenCalledTimes(4)
    expect(pongLoader).toHaveBeenCalledTimes(2)

    expect(await rpcMatcher.match('POST', '/nested/pong')).toEqual({
      path: ['nested', 'pong'],
      procedure: (await unlazy(router.nested.pong)).default,
    })

    expect(pingLoader).toHaveBeenCalledTimes(4)
    expect(pongLoader).toHaveBeenCalledTimes(4)

    expect(await rpcMatcher.match('POST', '/')).toEqual(undefined)
    expect(await rpcMatcher.match('POST', '/not_found')).toEqual(undefined)

    expect(pingLoader).toHaveBeenCalledTimes(4)
    expect(pongLoader).toHaveBeenCalledTimes(4)
  })

  it('filter procedures', async () => {
    const rpcMatcher = new StandardRPCMatcher({
      filter: (options) => {
        if (options.path.includes('ping')) {
          return false
        }

        return true
      },
    })
    rpcMatcher.init(router)

    expect(await rpcMatcher.match('ANYTHING', '/ping')).toEqual(undefined)
    expect(await rpcMatcher.match('ANYTHING', '/nested/ping')).toEqual(undefined)

    expect(await rpcMatcher.match('ANYTHING', '/pong')).toEqual({
      path: ['pong'],
      procedure: pong,
    })
  })
})
