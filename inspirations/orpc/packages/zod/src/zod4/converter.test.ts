import * as z from 'zod/v4'
import * as zm from 'zod/v4-mini'
import {
  ZodToJsonSchemaConverter,
} from './converter'

describe('zodToJsonSchemaConverter', () => {
  const converter = new ZodToJsonSchemaConverter()

  it('works with recursive schemas', () => {
    const Schema = z.object({
      id: z.string(),
      name: z.string(),
      get parents() {
        return z.array(Schema).optional()
      },
    })

    const [required, json] = converter.convert(Schema, { strategy: 'input' })
    expect(required).toBe(true)
    expect(json).toEqual({
      type: 'object',
      properties: {
        id: { type: 'string' },
        name: { type: 'string' },
        parents: {
          type: 'array',
          items: expect.objectContaining({ type: 'object' }),
        },
      },
      required: ['id', 'name'],
    })
  })

  it('.condition', async () => {
    expect(converter.condition(z.string())).toBe(true)
    expect(converter.condition(z.string().optional())).toBe(true)

    const z3 = await import('zod/v3')
    expect(converter.condition(z3.string())).toBe(false)

    const v = await import('valibot')
    expect(converter.condition(v.string())).toBe(false)
  })

  it('zod mini', async () => {
    const schema = zm.object({
      value: zm.string().check(zm.minLength(5), zm.maxLength(10), zm.regex(/^[a-z\\]+$/)),
    })

    expect(converter.condition(schema)).toBe(true)

    const [required, json] = await converter.convert(schema, { strategy: 'input' })

    expect(required).toEqual(true)
    expect(json).toEqual({
      type: 'object',
      properties: {
        value: {
          type: 'string',
          maxLength: 10,
          minLength: 5,
          pattern: '^[a-z\\\\]+$',
        },
      },
      required: ['value'],
    })
  })
})
