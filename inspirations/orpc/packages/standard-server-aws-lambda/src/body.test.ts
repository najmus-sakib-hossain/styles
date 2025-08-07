import { Buffer } from 'node:buffer'
import { isAsyncIteratorObject } from '@orpc/shared'
import * as StandardServerModule from '@orpc/standard-server'
import { toLambdaBody, toStandardBody } from './body'

const getFilenameFromContentDispositionSpy = vi.spyOn(StandardServerModule, 'getFilenameFromContentDisposition')

beforeEach(() => {
  vi.clearAllMocks()
})

describe.each([true, false])('toStandardBody: base64=%s', (isBase64Encoded) => {
  it('undefined', async () => {
    const standardBody = await toStandardBody({
      body: undefined,
      headers: {},
      isBase64Encoded,
      rawPath: '/',
      pathParameters: {},
      queryStringParameters: {},
      requestContext: {} as any,
      stageVariables: {},
      rawQueryString: '',
      routeKey: '$default',
      version: '2.0',
    })

    expect(standardBody).toBe(undefined)
  })

  it('json', async () => {
    const standardBody = await toStandardBody({
      body: Buffer.from(JSON.stringify({ foo: 'bar' })).toString(isBase64Encoded ? 'base64' : 'utf8'),
      headers: {
        'content-type': 'application/json',
      },
      isBase64Encoded,
      rawPath: '/',
      pathParameters: {},
      queryStringParameters: {},
      requestContext: {} as any,
      stageVariables: {},
      rawQueryString: '',
      routeKey: '$default',
      version: '2.0',
    })

    expect(standardBody).toEqual({ foo: 'bar' })
  })

  it('json but empty body', async () => {
    const standardBody = await toStandardBody({
      body: Buffer.from('').toString(isBase64Encoded ? 'base64' : 'utf8'),
      headers: {
        'content-type': 'application/json',
      },
      isBase64Encoded,
      rawPath: '/',
      pathParameters: {},
      queryStringParameters: {},
      requestContext: {} as any,
      stageVariables: {},
      rawQueryString: '',
      routeKey: '$default',
      version: '2.0',
    })

    expect(standardBody).toEqual(undefined)
  })

  it('event iterator', async () => {
    const standardBody: any = await toStandardBody({
      body: Buffer.from('event: message\ndata: 123\n\nevent: done\ndata: 456\n\n').toString(isBase64Encoded ? 'base64' : 'utf8'),
      headers: {
        'content-type': 'text/event-stream',
      },
      isBase64Encoded,
      rawPath: '/',
      pathParameters: {},
      queryStringParameters: {},
      requestContext: {} as any,
      stageVariables: {},
      rawQueryString: '',
      routeKey: '$default',
      version: '2.0',
    })

    expect(standardBody).toSatisfy(isAsyncIteratorObject)

    expect(await standardBody.next()).toEqual({ done: false, value: 123 })
    expect(await standardBody.next()).toEqual({ done: true, value: 456 })
  })

  it('text', async () => {
    const standardBody: any = await toStandardBody({
      body: Buffer.from('foo').toString(isBase64Encoded ? 'base64' : 'utf8'),
      headers: {
        'content-type': 'text/plain',
      },
      isBase64Encoded,
      rawPath: '/',
      pathParameters: {},
      queryStringParameters: {},
      requestContext: {} as any,
      stageVariables: {},
      rawQueryString: '',
      routeKey: '$default',
      version: '2.0',
    })

    expect(standardBody).toBe('foo')
  })

  it('form-data', async () => {
    const form = new FormData()
    form.append('foo', 'bar')
    form.append('bar', 'baz')
    const res = new Response(form)

    const standardBody: any = await toStandardBody({
      body: Buffer.from(await res.arrayBuffer()).toString('base64'),
      headers: {
        'content-type': res.headers.get('content-type')!,
      },
      isBase64Encoded: true,
      rawPath: '/',
      pathParameters: {},
      queryStringParameters: {},
      requestContext: {} as any,
      stageVariables: {},
      rawQueryString: '',
      routeKey: '$default',
      version: '2.0',
    })

    expect(standardBody).toBeInstanceOf(FormData)
    expect(standardBody.get('foo')).toBe('bar')
    expect(standardBody.get('bar')).toBe('baz')
  })

  it('form-data (empty)', async () => {
    await expect(toStandardBody({
      body: undefined,
      headers: {
        'content-type': 'multipart/form-data; boundary=foo',
      },
      isBase64Encoded,
      rawPath: '/',
      pathParameters: {},
      queryStringParameters: {},
      requestContext: {} as any,
      stageVariables: {},
      rawQueryString: '',
      routeKey: '$default',
      version: '2.0',
    })).rejects.toThrow('Failed to parse body as FormData.')
  })

  it('url-search-params', async () => {
    const standardBody: any = await toStandardBody({
      body: Buffer.from('foo=bar&bar=baz').toString(isBase64Encoded ? 'base64' : 'utf8'),
      headers: {
        'content-type': 'application/x-www-form-urlencoded',
      },
      isBase64Encoded,
      rawPath: '/',
      pathParameters: {},
      queryStringParameters: {},
      requestContext: {} as any,
      stageVariables: {},
      rawQueryString: '',
      routeKey: '$default',
      version: '2.0',
    })

    expect(standardBody).toEqual(new URLSearchParams('foo=bar&bar=baz'))
  })

  it('url-search-params (empty)', async () => {
    const standardBody: any = await toStandardBody({
      body: undefined,
      headers: {
        'content-type': 'application/x-www-form-urlencoded',
      },
      isBase64Encoded,
      rawPath: '/',
      pathParameters: {},
      queryStringParameters: {},
      requestContext: {} as any,
      stageVariables: {},
      rawQueryString: '',
      routeKey: '$default',
      version: '2.0',
    })

    expect(standardBody).toEqual(new URLSearchParams())
  })

  it('blob', async () => {
    const standardBody: any = await toStandardBody({
      body: Buffer.from('foo').toString(isBase64Encoded ? 'base64' : 'utf8'),
      headers: {
        'content-type': 'application/pdf',
      },
      isBase64Encoded,
      rawPath: '/',
      pathParameters: {},
      queryStringParameters: {},
      requestContext: {} as any,
      stageVariables: {},
      rawQueryString: '',
      routeKey: '$default',
      version: '2.0',
    })

    expect(standardBody).toBeInstanceOf(File)
    expect(standardBody.name).toBe('blob')
    expect(standardBody.type).toBe('application/pdf')
    expect(await standardBody.text()).toBe('foo')

    expect(getFilenameFromContentDispositionSpy).toHaveBeenCalledTimes(0)
  })

  it('blob (empty)', async () => {
    const standardBody: any = await toStandardBody({
      body: undefined,
      headers: {
        'content-type': 'application/pdf',
      },
      isBase64Encoded,
      rawPath: '/',
      pathParameters: {},
      queryStringParameters: {},
      requestContext: {} as any,
      stageVariables: {},
      rawQueryString: '',
      routeKey: '$default',
      version: '2.0',
    })

    expect(standardBody).toBeInstanceOf(File)
    expect(standardBody.name).toBe('blob')
    expect(standardBody.type).toBe('application/pdf')
    expect(await standardBody.text()).toBe('')

    expect(getFilenameFromContentDispositionSpy).toHaveBeenCalledTimes(0)
  })

  it('file', async () => {
    getFilenameFromContentDispositionSpy.mockReturnValue('__name__')

    const standardBody: any = await toStandardBody({
      body: Buffer.from(JSON.stringify({ value: 123 })).toString(isBase64Encoded ? 'base64' : 'utf8'),
      headers: {
        'content-type': 'application/json',
        'content-disposition': 'attachment; filename="foo.pdf"',
      },
      isBase64Encoded,
      rawPath: '/',
      pathParameters: {},
      queryStringParameters: {},
      requestContext: {} as any,
      stageVariables: {},
      rawQueryString: '',
      routeKey: '$default',
      version: '2.0',
    })

    expect(standardBody).toBeInstanceOf(File)
    expect(standardBody.name).toBe('__name__')
    expect(standardBody.type).toBe('application/json')
    expect(await standardBody.text()).toBe('{"value":123}')

    expect(getFilenameFromContentDispositionSpy).toHaveBeenCalledTimes(1)
    expect(getFilenameFromContentDispositionSpy).toHaveBeenCalledWith('attachment; filename="foo.pdf"')
  })

  it('file with content-disposition (no filename)', async () => {
    getFilenameFromContentDispositionSpy.mockReturnValue(undefined)

    const standardBody: any = await toStandardBody({
      body: Buffer.from(JSON.stringify({ value: 123 })).toString(isBase64Encoded ? 'base64' : 'utf8'),
      headers: {
        'content-type': 'application/json',
        'content-disposition': 'attachment',
      },
      isBase64Encoded,
      rawPath: '/',
      pathParameters: {},
      queryStringParameters: {},
      requestContext: {} as any,
      stageVariables: {},
      rawQueryString: '',
      routeKey: '$default',
      version: '2.0',
    })

    expect(standardBody).toBeInstanceOf(File)
    expect(standardBody.name).toBe('blob')
    expect(standardBody.type).toBe('application/json')
    expect(await standardBody.text()).toBe('{"value":123}')

    expect(getFilenameFromContentDispositionSpy).toHaveBeenCalledTimes(1)
    expect(getFilenameFromContentDispositionSpy).toHaveBeenCalledWith('attachment')
  })

  it('file (no content-type)', async () => {
    getFilenameFromContentDispositionSpy.mockReturnValue(undefined)

    const standardBody: any = await toStandardBody({
      body: Buffer.from(JSON.stringify({ value: 123 })).toString(isBase64Encoded ? 'base64' : 'utf8'),
      headers: {
        'content-disposition': 'attachment',
      },
      isBase64Encoded,
      rawPath: '/',
      pathParameters: {},
      queryStringParameters: {},
      requestContext: {} as any,
      stageVariables: {},
      rawQueryString: '',
      routeKey: '$default',
      version: '2.0',
    })

    expect(standardBody).toBeInstanceOf(File)
    expect(standardBody.name).toBe('blob')
    expect(standardBody.type).toBe('')
    expect(await standardBody.text()).toBe('{"value":123}')

    expect(getFilenameFromContentDispositionSpy).toHaveBeenCalledTimes(1)
    expect(getFilenameFromContentDispositionSpy).toHaveBeenCalledWith('attachment')
  })
})

it('toLambdaBody', async () => {
  const baseHeaders = {
    'content-type': 'application/json',
    'x-custom-header': 'custom-value',
  }

  const [body, headers] = toLambdaBody({ foo: 'bar' }, baseHeaders, {})

  expect(body).toBe('{"foo":"bar"}')
  expect(headers).toEqual({
    'content-type': 'application/json',
    'x-custom-header': 'custom-value',
  })
})
