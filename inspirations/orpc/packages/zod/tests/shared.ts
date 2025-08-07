import type { AnySchema } from '@orpc/contract'
import type { JSONSchema } from '@orpc/openapi'
import {
  experimental_ZodSmartCoercionPlugin as ZodSmartCoercionPlugin,
  ZodToJsonSchemaConverter,
} from '../src/zod4'

export interface SchemaConverterTestCase {
  name: string
  schema: AnySchema
  input: [boolean, JSONSchema & Record<string, unknown>]
  output?: [boolean, JSONSchema & Record<string, unknown>]
}

export function testSchemaConverter(cases: SchemaConverterTestCase[]) {
  const converter = new ZodToJsonSchemaConverter({ maxLazyDepth: 1 })
  describe.each([['input'], ['output']] as const)('ZodToJsonSchemaConverter.converter: strategy = %s', (strategy) => {
    it.each(cases)('$name', ({ schema, input, output = input }) => {
      const [expectedRequired, expectedJson] = strategy === 'input' ? input : output
      const [required, json] = converter.convert(schema, { strategy })
      expect(json).toEqual(expectedJson)
      expect(required).toEqual(expectedRequired)
    })
  })
}

export interface SchemaSmartCoercionTestCase {
  name: string
  schema: AnySchema
  input: unknown
  expected?: unknown
}

export function testSchemaSmartCoercion(cases: SchemaSmartCoercionTestCase[]) {
  const plugin = new ZodSmartCoercionPlugin()
  const options = {} as any
  plugin.init(options)

  const coerce = (schema: AnySchema, input: unknown) => {
    let coerced: unknown

    options.clientInterceptors[0]({
      procedure: {
        '~orpc': {
          inputSchema: schema,
        },
      },
      input,
      next: ({ input }: any) => {
        coerced = input
      },
    })

    return coerced
  }

  it.each(cases)('$name', ({ schema, input, expected = input }) => {
    expect(coerce(schema, input)).toEqual(expected)
  })
}
