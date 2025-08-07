import { decodeParams, toRou3Pattern } from './utils'

it('toRou3Pattern', () => {
  expect(toRou3Pattern('/api/v1/users/{id}')).toBe('/api/v1/users/:id')
  expect(toRou3Pattern('/api/v1/users/{+id}')).toBe('/api/v1/users/**:id')
  expect(toRou3Pattern('/api/v1/users/name')).toBe('/api/v1/users/name')
  expect(toRou3Pattern('/api/v1/users/name{id}')).toBe('/api/v1/users/name{id}')
})

it('decodeParams', () => {
  expect(decodeParams({ id: '1' })).toEqual({ id: '1' })
  expect(decodeParams({ id: '1%2B1' })).toEqual({ id: '1+1' })
})
