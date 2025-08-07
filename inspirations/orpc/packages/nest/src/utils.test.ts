import { oc } from '@orpc/contract'
import { inputSchema, outputSchema } from '../../contract/tests/shared'
import { populateContractRouterPaths, toNestPattern } from './utils'

it('toNestPattern', () => {
  expect(toNestPattern('/ping')).toBe('/ping')
  expect(toNestPattern('/ping')).toBe('/ping')
  expect(toNestPattern('/{id}')).toBe('/:id')
  expect(toNestPattern('/{id}/{+path}')).toBe('/:id/*path')

  expect(toNestPattern('/{id}/name{name}')).toBe('/:id/name{name}')
})

it('populateContractRouterPaths', () => {
  const contract = {
    ping: oc.input(inputSchema),
    pong: oc.route({
      path: '/pong/{id}',
    }),
    nested: {
      ping: oc.output(outputSchema),
      pong: oc.route({
        path: '/pong2/{id}',
      }),
    },
  }

  const populated = populateContractRouterPaths(contract)

  expect(populated.pong['~orpc'].route.path).toBe('/pong/{id}')
  expect(populated.nested.pong['~orpc'].route.path).toBe('/pong2/{id}')

  expect(populated.ping['~orpc'].route.path).toBe('/ping')
  expect(populated.ping['~orpc'].inputSchema).toBe(inputSchema)

  expect(populated.nested.ping['~orpc'].route.path).toBe('/nested/ping')
  expect(populated.nested.ping['~orpc'].outputSchema).toBe(outputSchema)
})
