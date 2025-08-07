import { oc } from './builder'
import { inferRPCMethodFromContractRouter } from './link-utils'
import { minifyContractRouter } from './router-utils'

it('inferRPCMethodFromContractRouter', () => {
  const method = inferRPCMethodFromContractRouter(minifyContractRouter({
    head: oc.route({ method: 'HEAD' }),
    get: oc.route({ method: 'GET' }),
    post: oc.route({}),
    nested: {
      get: oc.route({ method: 'GET' }),
      delete: oc.route({ method: 'DELETE' }),
    },
  }))

  expect(method({}, ['head'])).toBe('GET')
  expect(method({}, ['get'])).toBe('GET')
  expect(method({}, ['post'])).toBe('POST')
  expect(method({}, ['nested', 'get'])).toBe('GET')
  expect(method({}, ['nested', 'delete'])).toBe('DELETE')

  expect(() => method({}, ['nested', 'not-exist'])).toThrow(/No valid procedure found at path/)
})
