import { ping, pong, router } from '../tests/shared'
import { isContractProcedure } from './procedure'
import { enhanceRoute } from './route'
import { enhanceContractRouter, getContractRouter, minifyContractRouter } from './router-utils'

it('getContractRouter', () => {
  expect(getContractRouter(router, [])).toEqual(router)
  expect(getContractRouter(router, ['ping'])).toEqual(router.ping)
  expect(getContractRouter(router, ['nested', 'pong'])).toEqual(router.nested.pong)

  expect(getContractRouter(router, ['not-exist'])).toBeUndefined()
  expect(getContractRouter(router, ['nested', 'not-exist', 'not-exist'])).toBeUndefined()

  expect(getContractRouter(router, ['pong', '~orpc'])).toBeUndefined()
  expect(getContractRouter(router, ['ping', '~orpc'])).toBeUndefined()
})

it('enhanceContractRouter', async () => {
  const errorMap = {
    INVALID: { message: 'INVALID' },
    OVERRIDE: { message: 'OVERRIDE' },
  }
  const options = { errorMap, prefix: '/enhanced', tags: ['enhanced'] } as const

  const enhanced = enhanceContractRouter(router, options)

  expect(enhanced.ping['~orpc'].errorMap).toEqual({ ...errorMap, ...ping['~orpc'].errorMap })
  expect(enhanced.ping['~orpc'].route).toEqual(enhanceRoute(ping['~orpc'].route, options))

  expect(enhanced.pong['~orpc'].errorMap).toEqual({ ...errorMap, ...pong['~orpc'].errorMap })
  expect(enhanced.pong['~orpc'].route).toEqual(enhanceRoute(pong['~orpc'].route, options))

  expect(enhanced.nested.ping['~orpc'].errorMap).toEqual({ ...errorMap, ...ping['~orpc'].errorMap })
  expect(enhanced.nested.ping['~orpc'].route).toEqual(enhanceRoute(ping['~orpc'].route, options))

  expect(enhanced.nested.pong['~orpc'].errorMap).toEqual({ ...errorMap, ...pong['~orpc'].errorMap })
  expect(enhanced.nested.pong['~orpc'].route).toEqual(enhanceRoute(pong['~orpc'].route, options))
})

it('minifyContractRouter', () => {
  const minified = minifyContractRouter(router)

  const minifiedPing = {
    '~orpc': {
      errorMap: {},
      meta: {
        mode: 'dev',
      },
      route: {
        path: '/base',
      },
    },
  }

  const minifiedPong = {
    '~orpc': {
      errorMap: {},
      meta: {},
      route: {},
    },
  }

  expect((minified as any).ping).toSatisfy(isContractProcedure)
  expect((minified as any).ping).toEqual(minifiedPing)

  expect((minified as any).pong).toSatisfy(isContractProcedure)
  expect((minified as any).pong).toEqual(minifiedPong)

  expect((minified as any).nested.ping).toSatisfy(isContractProcedure)
  expect((minified as any).nested.ping).toEqual(minifiedPing)

  expect((minified as any).nested.pong).toSatisfy(isContractProcedure)
  expect((minified as any).nested.pong).toEqual(minifiedPong)
})
