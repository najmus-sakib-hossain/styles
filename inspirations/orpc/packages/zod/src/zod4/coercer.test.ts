import * as z from 'zod/v4'
import {
  experimental_ZodSmartCoercionPlugin as ZodSmartCoercionPlugin,
} from './coercer'

it('zodSmartCoercionPlugin ignore non-zod schemas', async () => {
  const plugin = new ZodSmartCoercionPlugin()
  const options = {} as any
  plugin.init(options)

  const coerce = (schema: any, input: unknown) => {
    let coerced: unknown

    options.clientInterceptors[0]({
      procedure: {
        '~orpc': {
          inputSchema: schema,
        },
      },
      input,
      next: (options: any) => {
        coerced = typeof options === 'object' ? options.input : input
      },
    })

    return coerced
  }

  const val = { value: 123 }

  expect(coerce(z.object({}), val)).toEqual(val)
  expect(coerce(z.object({}), val)).not.toBe(val)

  const z3 = await import('zod/v3')
  expect(coerce(z3.object({}), val)).toBe(val)

  const v = await import('valibot')
  expect(coerce(v.object({}), val)).toBe(val)
})
