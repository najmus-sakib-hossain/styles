import { enhanceRoute, mergePrefix, mergeRoute, mergeTags, prefixRoute, unshiftTagRoute } from './route'

it('mergeRoute', () => {
  expect(mergeRoute({ path: '/api' }, { path: '/v1' })).toEqual({ path: '/v1' })
  expect(mergeRoute({ path: '/api' }, { path: '/v1', method: 'GET' })).toEqual({ path: '/v1', method: 'GET' })
  expect(mergeRoute({ path: '/api', method: 'GET' }, { path: '/v1' })).toEqual({ path: '/v1', method: 'GET' })
})

it('prefixRoute', () => {
  expect(prefixRoute({ tags: ['tag'] }, '/api')).toEqual({ tags: ['tag'] })
  expect(prefixRoute({ path: '/api' }, '/v1')).toEqual({ path: '/v1/api' })
  expect(prefixRoute({ path: '/api', method: 'GET' }, '/v1')).toEqual({ path: '/v1/api', method: 'GET' })
})

it('unshiftTagRoute', () => {
  expect(unshiftTagRoute({ path: '/api' }, ['tag2'])).toEqual({ path: '/api', tags: ['tag2'] })
  expect(unshiftTagRoute({ tags: ['tag'] }, ['tag2'])).toEqual({ tags: ['tag2', 'tag'] })
  expect(unshiftTagRoute({ tags: ['tag'] }, ['tag', 'tag3'])).toEqual({ tags: ['tag', 'tag3', 'tag'] })
})

it('mergePrefix', () => {
  expect(mergePrefix(undefined, '/v1')).toEqual('/v1')
  expect(mergePrefix('/api', '/v1')).toEqual('/api/v1')
})

it('mergeTags', () => {
  expect(mergeTags(undefined, ['tag'])).toEqual(['tag'])
  expect(mergeTags(['tag'], ['tag2'])).toEqual(['tag', 'tag2'])
  expect(mergeTags(['tag'], ['tag', 'tag2'])).toEqual(['tag', 'tag', 'tag2'])
})

it('enhanceRoute', () => {
  const route = {
    path: '/api/v1',
    tags: ['tag'],
    description: 'description',
  } as const

  expect(enhanceRoute(route, {
    prefix: '/adapt',
    tags: ['adapt'],
  })).toEqual({
    path: '/adapt/api/v1',
    tags: ['adapt', 'tag'],
    description: 'description',
  })

  expect(enhanceRoute(route, {
    prefix: '/adapt',
  })).toEqual({
    path: '/adapt/api/v1',
    tags: ['tag'],
    description: 'description',
  })

  expect(enhanceRoute(route, {
    tags: ['adapt'],
  })).toEqual({
    path: '/api/v1',
    tags: ['adapt', 'tag'],
    description: 'description',
  })

  expect(enhanceRoute(route, {})).toBe(route)
})
