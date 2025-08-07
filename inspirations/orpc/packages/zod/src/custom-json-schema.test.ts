import { z } from 'zod/v3'
import { customJsonSchema, getCustomJsonSchema } from './custom-json-schema'

describe('custom json schema', () => {
  it('both strategy', () => {
    const schema = customJsonSchema(z.string(), { $comment: '__COMMENT__' }, { strategy: 'both' })

    expect(() => schema.parse(123)).toThrow('Expected string, received number')

    expect(getCustomJsonSchema(schema._def, { strategy: 'both' })).toEqual({ $comment: '__COMMENT__' })
    expect(getCustomJsonSchema(schema._def, { strategy: 'input' })).toEqual({ $comment: '__COMMENT__' })
    expect(getCustomJsonSchema(schema._def, { strategy: 'output' })).toEqual({ $comment: '__COMMENT__' })
  })

  it('input strategy', () => {
    const schema = customJsonSchema(z.string(), { $comment: '__COMMENT__' }, { strategy: 'input' })

    expect(() => schema.parse(123)).toThrow('Expected string, received number')

    expect(getCustomJsonSchema(schema._def, { strategy: 'both' })).toEqual(undefined)
    expect(getCustomJsonSchema(schema._def, { strategy: 'input' })).toEqual({ $comment: '__COMMENT__' })
    expect(getCustomJsonSchema(schema._def, { strategy: 'output' })).toEqual(undefined)
  })

  it('output strategy', () => {
    const schema = customJsonSchema(z.string(), { $comment: '__COMMENT__' }, { strategy: 'output' })

    expect(() => schema.parse(123)).toThrow('Expected string, received number')

    expect(getCustomJsonSchema(schema._def, { strategy: 'both' })).toEqual(undefined)
    expect(getCustomJsonSchema(schema._def, { strategy: 'input' })).toEqual(undefined)
    expect(getCustomJsonSchema(schema._def, { strategy: 'output' })).toEqual({ $comment: '__COMMENT__' })
  })
})
