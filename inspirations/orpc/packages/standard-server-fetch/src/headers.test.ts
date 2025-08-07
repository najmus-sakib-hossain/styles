import type { StandardHeaders } from '@orpc/standard-server'
import { toFetchHeaders, toStandardHeaders } from './headers'

it('toStandardHeaders', () => {
  const standardHeaders: StandardHeaders = {
    'x-custom-header': ['custom-value'],
  }

  const headers = new Headers()

  headers.append('content-type', 'application/json')
  headers.append('x-custom-header', 'custom-value-2')
  headers.append('set-cookie', 'foo=bar')
  headers.append('set-cookie', 'bar=baz')

  expect(toStandardHeaders(headers, standardHeaders)).toBe(standardHeaders)

  expect(standardHeaders).toEqual({
    'content-type': 'application/json',
    'x-custom-header': ['custom-value', 'custom-value-2'],
    'set-cookie': ['foo=bar', 'bar=baz'],
  })
})

it('toFetchHeaders', () => {
  const fetchHeaders = new Headers({
    'x-custom-header': 'custom-value',
  })

  const standardHeaders: StandardHeaders = {
    'content-type': 'application/json',
    'x-custom-header': ['custom-value-2'],
    'set-cookie': ['foo=bar', 'bar=baz'],
  }

  expect(toFetchHeaders(standardHeaders, fetchHeaders)).toBe(fetchHeaders)

  expect([...fetchHeaders]).toEqual([
    ['content-type', 'application/json'],
    ['set-cookie', 'foo=bar'],
    ['set-cookie', 'bar=baz'],
    ['x-custom-header', 'custom-value, custom-value-2'],
  ])
})
