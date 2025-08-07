import { toLambdaHeaders, toStandardHeaders } from './headers'

it('toStandardHeaders', () => {
  expect(toStandardHeaders({
    'content-type': 'application/json',
    'content-length': '12',
    'set-cookie': 'invalid',
  }, [
    'value1',
    'value2',
  ])).toEqual({
    'content-type': 'application/json',
    'content-length': '12',
    'set-cookie': ['value1', 'value2'],
  })
})

it('toLambdaHeaders', () => {
  const [headers, cookies] = toLambdaHeaders({
    'content-type': 'application/json',
    'content-length': ['12', '34'],
    'set-cookie': ['value1', 'value2'],
    'x-custom-header': undefined,
  })

  expect(headers).toEqual({
    'content-type': 'application/json',
    'content-length': '12, 34',
  })

  expect(cookies).toEqual(['value1', 'value2'])
})
