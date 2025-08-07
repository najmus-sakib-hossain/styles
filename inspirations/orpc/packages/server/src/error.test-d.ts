import type { ORPCError } from '@orpc/client'
import type { baseErrorMap } from '../../contract/tests/shared'
import type { ORPCErrorConstructorMap } from './error'

it('ORPCErrorConstructorMap', () => {
  const constructors = {} as ORPCErrorConstructorMap<typeof baseErrorMap>

  const error = constructors.BASE({ data: { output: 123 } })
  expectTypeOf(error).toEqualTypeOf<ORPCError<'BASE', { output: number }>>()

  // @ts-expect-error - invalid data
  constructors.BASE({ data: { output: '123' } })
  // @ts-expect-error - missing data
  constructors.BASE()
  // can call without data if it is optional
  constructors.OVERRIDE()
})
