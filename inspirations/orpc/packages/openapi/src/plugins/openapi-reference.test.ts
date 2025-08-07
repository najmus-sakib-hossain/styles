import { os } from '@orpc/server'
import * as z from 'zod'
import { ZodToJsonSchemaConverter } from '../../../zod/src'
import { OpenAPIHandler } from '../adapters/fetch/openapi-handler'
import { OpenAPIGenerator } from '../openapi-generator'
import { OpenAPIReferencePlugin } from './openapi-reference'

describe('openAPIReferencePlugin', () => {
  const jsonSchemaConverter = new ZodToJsonSchemaConverter()
  const generator = new OpenAPIGenerator({
    schemaConverters: [jsonSchemaConverter],
  })
  const router = { ping: os.input(z.object({ name: z.string() })).handler(() => 'pong') }

  it('serve docs and spec endpoints', async () => {
    const handler = new OpenAPIHandler(router, {
      plugins: [
        new OpenAPIReferencePlugin({
          schemaConverters: [jsonSchemaConverter],
        }),
      ],
    })

    const { response } = await handler.handle(new Request('http://localhost:3000'))

    expect(response!.status).toBe(200)
    expect(response!.headers.get('content-type')).toBe('text/html')
    expect(await response!.text()).toContain('<title>API Reference</title>')

    const { response: specResponse } = await handler.handle(new Request('http://localhost:3000/spec.json'))

    expect(specResponse!.status).toBe(200)
    expect(specResponse!.headers.get('content-type')).toBe('application/json')
    expect(await specResponse!.json()).toEqual({
      ...await generator.generate(router),
      servers: [{ url: 'http://localhost:3000/' }],
    })

    expect(
      await handler.handle(new Request('http://localhost:3000/not_found')),
    ).toEqual({ matched: false })
  })

  it('serve docs and spec endpoints with prefix', async () => {
    const handler = new OpenAPIHandler(router, {
      plugins: [
        new OpenAPIReferencePlugin({
          schemaConverters: [jsonSchemaConverter],
        }),
      ],
    })

    const { response } = await handler.handle(new Request('http://localhost:3000/api'), {
      prefix: '/api',
    })

    expect(response!.status).toBe(200)
    expect(response!.headers.get('content-type')).toBe('text/html')
    expect(await response!.text()).toContain('<title>API Reference</title>')

    const { response: specResponse } = await handler.handle(new Request('http://localhost:3000/api/spec.json'), {
      prefix: '/api',
    })

    expect(specResponse!.status).toBe(200)
    expect(specResponse!.headers.get('content-type')).toBe('application/json')
    expect(await specResponse!.json()).toEqual({
      ...await generator.generate(router),
      servers: [{ url: 'http://localhost:3000/api' }],
    })

    expect(
      await handler.handle(new Request('http://localhost:3000'), {
        prefix: '/api',
      }),
    ).toEqual({ matched: false })

    expect(
      await handler.handle(new Request('http://localhost:3000/spec.json'), {
        prefix: '/api',
      }),
    ).toEqual({ matched: false })

    expect(
      await handler.handle(new Request('http://localhost:3000/api/not_found'), {
        prefix: '/api',
      }),
    ).toEqual({ matched: false })
  })

  it('not serve docs and spec endpoints if procedure matched', async () => {
    const router = {
      ping: os.route({ method: 'GET', path: '/' }).handler(() => 'pong'),
      pong: os.route({ method: 'GET', path: '/spec.json' }).handler(() => 'ping'),
    }

    const handler = new OpenAPIHandler(router, {
      plugins: [
        new OpenAPIReferencePlugin({
          schemaConverters: [jsonSchemaConverter],
        }),
      ],
    })

    const { response } = await handler.handle(new Request('http://localhost:3000'))
    expect(await response!.json()).toEqual('pong')

    const { response: specResponse } = await handler.handle(new Request('http://localhost:3000/spec.json'))
    expect(await specResponse!.json()).toEqual('ping')

    const { matched } = await handler.handle(new Request('http://localhost:3000/not_found'))
    expect(matched).toBe(false)
  })

  it('with config', async () => {
    const handler = new OpenAPIHandler(router, {
      plugins: [
        new OpenAPIReferencePlugin({
          schemaConverters: [jsonSchemaConverter],
          docsConfig: async () => ({ foo: '__SOME_VALUE__' }),
        }),
      ],
    })

    const { response } = await handler.handle(new Request('http://localhost:3000'))

    expect(response!.status).toBe(200)
    expect(response!.headers.get('content-type')).toBe('text/html')
    expect(await response!.text()).toContain('__SOME_VALUE__')
  })
})
