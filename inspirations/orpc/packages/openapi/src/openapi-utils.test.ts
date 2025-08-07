import type { OpenAPI } from '@orpc/contract'
import type { FileSchema, JSONSchema, ObjectSchema } from './schema'
import { checkParamsSchema, resolveOpenAPIJsonSchemaRef, toOpenAPIContent, toOpenAPIEventIteratorContent, toOpenAPIMethod, toOpenAPIParameters, toOpenAPIPath, toOpenAPISchema } from './openapi-utils'

it('toOpenAPIPath', () => {
  expect(toOpenAPIPath('/path')).toBe('/path')
  expect(toOpenAPIPath('/path//{id}')).toBe('/path/{id}')
  expect(toOpenAPIPath('/path//to/{+id}')).toBe('/path/to/{id}')
  expect(toOpenAPIPath('//path//{+id}//something{+id}//')).toBe('/path/{id}/something{+id}')
})

it('toOpenAPIMethod', () => {
  expect(toOpenAPIMethod('GET')).toBe('get')
  expect(toOpenAPIMethod('POST')).toBe('post')
  expect(toOpenAPIMethod('PUT')).toBe('put')
  expect(toOpenAPIMethod('DELETE')).toBe('delete')
  expect(toOpenAPIMethod('PATCH')).toBe('patch')
})

describe('toOpenAPIContent', () => {
  const fileSchema: FileSchema = { type: 'string', contentMediaType: 'image/png' }

  it('normal schema', () => {
    const schema: JSONSchema = {
      type: 'object',
      properties: {
        a: { type: 'string' },
        b: { type: 'number' },
      },
      required: ['a'],
    }

    expect(toOpenAPIContent(schema)).toEqual({
      'application/json': {
        schema,
      },
    })
  })

  it('body can be file schema', () => {
    expect(toOpenAPIContent(fileSchema)).toEqual({
      'image/png': {
        schema: fileSchema,
      },
    })

    expect(toOpenAPIContent({
      anyOf: [
        fileSchema,
        { type: 'number' },
      ],
    })).toEqual({
      'image/png': {
        schema: fileSchema,
      },
      'application/json': {
        schema: { type: 'number' },
      },
    })
  })

  it('body contain file schema', () => {
    const schema: JSONSchema = {
      type: 'object',
      properties: {
        a: { type: 'string' },
        b: { type: 'number' },
        c: fileSchema,
      },
      required: ['a'],
    }

    expect(toOpenAPIContent(schema)).toEqual({
      'application/json': {
        schema,
      },
      'multipart/form-data': {
        schema,
      },
    })
  })
})

describe('toOpenAPIEventIteratorContent', () => {
  it('required yields & not required returns', () => {
    expect(toOpenAPIEventIteratorContent([true, { type: 'string' }], [false, { type: 'number' }])).toEqual({
      'text/event-stream': {
        schema: {
          oneOf: [
            {
              type: 'object',
              properties: {
                event: { const: 'message' },
                data: { type: 'string' },
                id: { type: 'string' },
                retry: { type: 'number' },
              },
              required: ['event', 'data'],
            },
            {
              type: 'object',
              properties: {
                event: { const: 'done' },
                data: { type: 'number' },
                id: { type: 'string' },
                retry: { type: 'number' },
              },
              required: ['event'],
            },
            {
              type: 'object',
              properties: {
                event: { const: 'error' },
                data: {},
                id: { type: 'string' },
                retry: { type: 'number' },
              },
              required: ['event'],
            },
          ],
        },
      },
    })
  })

  it('not required yields & required returns', () => {
    expect(toOpenAPIEventIteratorContent([false, { type: 'string' }], [true, { type: 'number' }])).toEqual({
      'text/event-stream': {
        schema: {
          oneOf: [
            {
              type: 'object',
              properties: {
                event: { const: 'message' },
                data: { type: 'string' },
                id: { type: 'string' },
                retry: { type: 'number' },
              },
              required: ['event'],
            },
            {
              type: 'object',
              properties: {
                event: { const: 'done' },
                data: { type: 'number' },
                id: { type: 'string' },
                retry: { type: 'number' },
              },
              required: ['event', 'data'],
            },
            {
              type: 'object',
              properties: {
                event: { const: 'error' },
                data: {},
                id: { type: 'string' },
                retry: { type: 'number' },
              },
              required: ['event'],
            },
          ],
        },
      },
    })
  })
})

describe('toOpenAPIParameters', () => {
  const schema: ObjectSchema = {
    type: 'object',
    properties: {
      a: { type: 'string' },
      b: {
        type: 'object',
        properties: {
          b1: { type: 'number' },
          b2: { type: 'string' },
        },
        required: ['b1'],
      },
      c: {
        oneOf: [
          { type: 'string' },
          { type: 'array', items: { type: 'string' } },
        ],
      },
    },
    required: ['a', 'c'],
  }

  it('normal', () => {
    expect(toOpenAPIParameters(schema, 'path')).toEqual([{
      name: 'a',
      in: 'path',
      required: true,
      schema: {
        type: 'string',
      },
    }, {
      name: 'b',
      in: 'path',
      required: false,
      schema: {
        type: 'object',
        properties: {
          b1: { type: 'number' },
          b2: { type: 'string' },
        },
        required: ['b1'],
      },
    }, {
      name: 'c',
      in: 'path',
      required: true,
      schema: {
        oneOf: [
          { type: 'string' },
          { type: 'array', items: { type: 'string' } },
        ],
      },
    }])
  })

  it('query', () => {
    expect(toOpenAPIParameters(schema, 'query')).toEqual([{
      name: 'a',
      in: 'query',
      required: true,
      schema: {
        type: 'string',
      },
      allowEmptyValue: true,
      allowReserved: true,
    }, {
      name: 'b',
      in: 'query',
      required: false,
      explode: true,
      style: 'deepObject',
      schema: {
        type: 'object',
        properties: {
          b1: { type: 'number' },
          b2: { type: 'string' },
        },
        required: ['b1'],
      },
      allowEmptyValue: true,
      allowReserved: true,
    }, {
      name: 'c',
      in: 'query',
      required: true,
      schema: {
        oneOf: [
          { type: 'string' },
          { type: 'array', items: { type: 'string' } },
        ],
      },
      allowEmptyValue: true,
      allowReserved: true,
    }])
  })
})

describe('checkParamsSchema', () => {
  it('missing properties', () => {
    const schema: ObjectSchema = {
      type: 'object',
      required: ['a', 'b'],
    }

    expect(checkParamsSchema(schema, ['a', 'b'])).toBe(false)
  })

  it('redundant properties', () => {
    const schema: ObjectSchema = {
      type: 'object',
      properties: {
        a: { type: 'string' },
        b: { type: 'string' },
      },
      required: ['a', 'b'],
    }

    expect(checkParamsSchema(schema, ['a'])).toBe(false)
  })

  it('missing required', () => {
    const schema: ObjectSchema = {
      type: 'object',
      properties: {
        a: { type: 'string' },
        b: { type: 'string' },
      },
    }

    expect(checkParamsSchema(schema, ['a', 'b'])).toBe(false)
  })

  it('redundant required', () => {
    const schema: ObjectSchema = {
      type: 'object',
      properties: {
        a: { type: 'string' },
      },
      required: ['a', 'b'],
    }

    expect(checkParamsSchema(schema, ['a'])).toBe(false)
  })

  it('correct', () => {
    const schema: ObjectSchema = {
      type: 'object',
      properties: {
        a: { type: 'string' },
        b: { type: 'string' },
      },
      required: ['a', 'b'],
    }

    expect(checkParamsSchema(schema, ['a', 'b'])).toBe(true)
  })
})

it('toOpenAPISchema', () => {
  expect(toOpenAPISchema(true)).toEqual({})
  expect(toOpenAPISchema(false)).toEqual({ not: {} })
  expect(toOpenAPISchema({ type: 'string' })).toEqual({ type: 'string' })
})

describe('resolveOpenAPIJsonSchemaRef', () => {
  const doc = {
    components: {
      schemas: {
        'a': { type: 'string' },
        'b': { type: 'number' },
        'c/c': { type: 'object' },
      },
    },
  } as any

  it('works', () => {
    expect(resolveOpenAPIJsonSchemaRef(doc, { $ref: '#/components/schemas/a' })).toEqual({ type: 'string' })
    expect(resolveOpenAPIJsonSchemaRef(doc, { $ref: '#/components/schemas/b' })).toEqual({ type: 'number' })
    expect(resolveOpenAPIJsonSchemaRef(doc, { $ref: '#/components/schemas/c/c' })).toEqual({ type: 'object' })
  })

  it('do nothing if schema is not $ref', () => {
    expect(resolveOpenAPIJsonSchemaRef(doc, true)).toEqual(true)
    expect(resolveOpenAPIJsonSchemaRef(doc, false)).toEqual(false)
    expect(resolveOpenAPIJsonSchemaRef(doc, {})).toEqual({})
    expect(resolveOpenAPIJsonSchemaRef(doc, { type: 'object' })).toEqual({ type: 'object' })
  })

  it('it do nothing if have no components.schemas', () => {
    const doc = {} as OpenAPI.Document
    const doc2 = {
      components: {},
    } as OpenAPI.Document

    expect(resolveOpenAPIJsonSchemaRef(doc, { type: 'string' })).toEqual({ type: 'string' })
    expect(resolveOpenAPIJsonSchemaRef(doc, { $ref: '#/components/schemas/a' })).toEqual({ $ref: '#/components/schemas/a' })
    expect(resolveOpenAPIJsonSchemaRef(doc2, { $ref: '#/components/schemas/a' })).toEqual({ $ref: '#/components/schemas/a' })
  })

  it('not resolve if $ref is not a components.schemas', () => {
    expect(resolveOpenAPIJsonSchemaRef(doc, { $ref: '#/$defs/a' })).toEqual({ $ref: '#/$defs/a' })
  })

  it('not resolve if $ref not found', () => {
    expect(resolveOpenAPIJsonSchemaRef(doc, { $ref: '#/components/schemas/not-found' })).toEqual({ $ref: '#/components/schemas/not-found' })
  })
})
