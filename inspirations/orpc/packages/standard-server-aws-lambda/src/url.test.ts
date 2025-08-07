import { toStandardUrl } from './url'

it('toStandardUrl', () => {
  expect(toStandardUrl({
    requestContext: {
      domainName: 'example.com',
    },
    rawPath: '/api/planets',
    rawQueryString: 'key1=value1&key2=value2',
  } as any)).toEqual(new URL('https://example.com/api/planets?key1=value1&key2=value2'))
})
