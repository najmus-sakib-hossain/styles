import { getDynamicParams, standardizeHTTPPath } from './utils'

it('standardizeHTTPPath', () => {
  expect(standardizeHTTPPath('/path')).toBe('/path')
  expect(standardizeHTTPPath('/path/')).toBe('/path')
  expect(standardizeHTTPPath('/path//to/something')).toBe('/path/to/something')
  expect(standardizeHTTPPath('//path//to//something//')).toBe('/path/to/something')
})

it('getDynamicParams', () => {
  expect(getDynamicParams(undefined)).toBe(undefined)
  expect(getDynamicParams('/path')).toBe(undefined)
  expect(getDynamicParams('/path/{id}')).toEqual([{ raw: '/{id}', name: 'id' }])
  expect(getDynamicParams('/path/{id}/{name}')).toEqual([{ raw: '/{id}', name: 'id' }, { raw: '/{name}', name: 'name' }])
  expect(getDynamicParams('/path/{name}/{+id}')).toEqual([{ raw: '/{name}', name: 'name' }, { raw: '/{+id}', name: 'id' }])
  expect(getDynamicParams('/path//{+id}//something{+name}//')).toEqual([{ raw: '/{+id}', name: 'id' }])
})
