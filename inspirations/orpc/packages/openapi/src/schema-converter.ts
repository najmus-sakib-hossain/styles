import type { AnySchema } from '@orpc/contract'
import type { Promisable } from '@orpc/shared'
import type { JSONSchema } from './schema'

export interface SchemaConverterComponent {
  allowedStrategies: readonly SchemaConvertOptions['strategy'][]
  schema: AnySchema
  required: boolean
  ref: string
}

export interface SchemaConvertOptions {
  strategy: 'input' | 'output'

  /**
   * Common components should use `$ref` to represent themselves if matched.
   */
  components?: readonly SchemaConverterComponent[]

  /**
   * Minimum schema structure depth required before using `$ref` for components.
   *
   * For example, if set to 2, `$ref` will only be used for schemas nested at depth 2 or greater.
   *
   * @default 0 - No depth limit;
   */
  minStructureDepthForRef?: number
}

export interface SchemaConverter {
  convert(schema: AnySchema | undefined, options: SchemaConvertOptions): Promisable<[required: boolean, jsonSchema: JSONSchema]>
}

export interface ConditionalSchemaConverter extends SchemaConverter {
  condition(schema: AnySchema | undefined, options: SchemaConvertOptions): Promisable<boolean>
}

export class CompositeSchemaConverter implements SchemaConverter {
  private readonly converters: readonly ConditionalSchemaConverter[]

  constructor(converters: readonly ConditionalSchemaConverter[]) {
    this.converters = converters
  }

  async convert(schema: AnySchema | undefined, options: SchemaConvertOptions): Promise<[required: boolean, jsonSchema: JSONSchema]> {
    for (const converter of this.converters) {
      if (await converter.condition(schema, options)) {
        return converter.convert(schema, options)
      }
    }

    return [false, {}]
  }
}
