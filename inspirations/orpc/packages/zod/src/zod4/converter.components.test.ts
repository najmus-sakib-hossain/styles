import { z } from 'zod/v4'
import { ZodToJsonSchemaConverter } from './converter'

const User = z.object({
  id: z.string(),
  name: z.string(),
  age: z.number().optional(),
  get parents() {
    return z.array(User).optional()
  },
})

const Pet = z.object({
  id: z.string(),
  name: z.string(),
  owner: z.lazy(() => User),
})

describe('zodToJsonSchemaConverter - components', () => {
  const converter = new ZodToJsonSchemaConverter({ maxLazyDepth: 1 })

  it.each([true, false])('works with Pet schema (required=%s)', (componentRequired) => {
    const [required, jsonSchema] = converter.convert(
      Pet,
      {
        strategy: 'input',
        components: [
          {
            schema: User,
            required: componentRequired,
            ref: '#/components/schemas/User',
            allowedStrategies: ['input', 'output'],
          },
        ],
      },
    )

    expect(required).toBe(true)
    expect(jsonSchema).toEqual({
      type: 'object',
      properties: {
        id: { type: 'string' },
        name: { type: 'string' },
        owner: { $ref: '#/components/schemas/User' },
      },
      required: componentRequired ? ['id', 'name', 'owner'] : ['id', 'name'],
    })
  })

  describe('minStructureDepthForRef', () => {
    it.each([true, false])('works with User schema (minStructureDepthForRef=0, required=%s)', (componentRequired) => {
      const [required, jsonSchema] = converter.convert(
        User,
        {
          strategy: 'input',
          components: [
            {
              schema: User,
              required: componentRequired,
              ref: '#/components/schemas/User',
              allowedStrategies: ['input', 'output'],
            },
          ],
          minStructureDepthForRef: 0,
        },
      )

      expect(required).toBe(componentRequired)
      expect(jsonSchema).toEqual({ $ref: '#/components/schemas/User' })
    })

    it.each([true, false])('works with User schema (minStructureDepthForRef=1, strategy=input, required=%s)', (componentRequired) => {
      const [required, jsonSchema] = converter.convert(
        User,
        {
          strategy: 'input',
          components: [
            {
              schema: User,
              required: componentRequired,
              ref: '#/components/schemas/User',
              allowedStrategies: ['input', 'output'],
            },
          ],
          minStructureDepthForRef: 1,
        },
      )

      expect(required).toBe(true)
      expect(jsonSchema).toEqual({
        type: 'object',
        properties: {
          id: { type: 'string' },
          name: { type: 'string' },
          age: { type: 'number' },
          parents: { type: 'array', items: { $ref: '#/components/schemas/User' } },
        },
        required: ['id', 'name'],
      })
    })

    it.each([true, false])('works with User schema (minStructureDepthForRef=1, strategy=output, required=%s)', (componentRequired) => {
      const [required, jsonSchema] = converter.convert(
        User,
        {
          strategy: 'output',
          components: [
            {
              schema: User,
              required: componentRequired,
              ref: '#/components/schemas/User',
              allowedStrategies: ['input', 'output'],
            },
          ],
          minStructureDepthForRef: 1,
        },
      )

      expect(required).toBe(true)
      expect(jsonSchema).toEqual({
        type: 'object',
        properties: {
          id: { type: 'string' },
          name: { type: 'string' },
          age: { type: 'number' },
          parents: {
            type: 'array',
            items: componentRequired
              ? { $ref: '#/components/schemas/User' }
              : {
                  anyOf: [
                    {
                      $ref: '#/components/schemas/User',
                    },
                    {
                      type: 'null',
                    },
                  ],
                },
          },
        },
        required: ['id', 'name'],
      })
    })

    it('works with User schema (minStructureDepthForRef=3)', () => {
      const [required, jsonSchema] = converter.convert(
        User,
        {
          strategy: 'input',
          components: [
            {
              schema: User,
              required: true,
              ref: '#/components/schemas/User',
              allowedStrategies: ['input', 'output'],
            },
          ],
          minStructureDepthForRef: 3,
        },
      )

      expect(required).toBe(true)
      expect(jsonSchema).toEqual({
        type: 'object',
        properties: {
          id: { type: 'string' },
          name: { type: 'string' },
          age: { type: 'number' },
          parents: {
            type: 'array',
            items: {
              type: 'object',
              properties: {
                id: { type: 'string' },
                name: { type: 'string' },
                age: { type: 'number' },
                parents: {
                  type: 'array',
                  items: { $ref: '#/components/schemas/User' },
                },
              },
              required: ['id', 'name'],
            },
          },
        },
        required: ['id', 'name'],
      })
    })
  })

  it('on unsupported strategy', () => {
    const Pet = z.object({
      id: z.string(),
      name: z.string(),
    })

    const [required, jsonSchema] = converter.convert(
      Pet,
      {
        strategy: 'output',
        components: [
          {
            schema: Pet,
            required: true,
            ref: '#/components/schemas/Pet',
            allowedStrategies: ['input'],
          },
        ],
      },
    )

    expect(required).toBe(true)
    expect(jsonSchema).toEqual({
      type: 'object',
      properties: {
        id: { type: 'string' },
        name: { type: 'string' },
      },
      required: ['id', 'name'],
    })
  })

  it('complex case', () => {
    const [required, jsonSchema] = converter.convert(
      z.object({
        users: z.array(User).optional(),
        pets: z.array(Pet).optional(),
        nested: z.array(z.object({
          user: User.optional(),
        })),
      }).optional(),
      {
        strategy: 'input',
        components: [
          {
            schema: User,
            required: true,
            ref: '#/components/schemas/User',
            allowedStrategies: ['input', 'output'],
          },
          {
            schema: Pet,
            required: true,
            ref: '#/components/schemas/Pet',
            allowedStrategies: ['input', 'output'],
          },
        ],
        minStructureDepthForRef: 2,
      },
    )

    expect(required).toBe(false)
    expect(jsonSchema).toEqual({
      type: 'object',
      properties: {
        users: {
          type: 'array',
          items: { $ref: '#/components/schemas/User' },
        },
        pets: {
          type: 'array',
          items: { $ref: '#/components/schemas/Pet' },
        },
        nested: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              user: { $ref: '#/components/schemas/User' },
            },
          },
        },
      },
      required: ['nested'],
    })
  })
})
