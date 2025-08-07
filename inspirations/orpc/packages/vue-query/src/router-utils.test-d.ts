import type { ErrorFromErrorMap } from '@orpc/contract'
import type { RouterClient } from '@orpc/server'
import type { baseErrorMap } from '../../contract/tests/shared'
import type { router } from '../../server/tests/shared'
import type { GeneralUtils } from './general-utils'
import type { ProcedureUtils } from './procedure-utils'
import type { RouterUtils } from './router-utils'

it('RouterUtils', () => {
  const utils = {} as RouterUtils<RouterClient<typeof router, { batch?: boolean }>>

  expectTypeOf(utils).toMatchTypeOf<GeneralUtils<unknown>>()
  expectTypeOf(utils.nested).toMatchTypeOf<GeneralUtils<unknown>>()

  expectTypeOf(utils.ping).toMatchTypeOf<GeneralUtils<{ input: number }>>()
  expectTypeOf(utils.nested.ping).toMatchTypeOf<GeneralUtils<{ input: number }>>()

  expectTypeOf(utils.ping).toMatchTypeOf<
    ProcedureUtils<{ batch?: boolean }, { input: number }, { output: string }, ErrorFromErrorMap<typeof baseErrorMap>>
  >()
  expectTypeOf(utils.nested.ping).toMatchTypeOf<
    ProcedureUtils<{ batch?: boolean }, { input: number }, { output: string }, ErrorFromErrorMap<typeof baseErrorMap>>
  >()

  expectTypeOf(utils.pong).toMatchTypeOf<
    ProcedureUtils<{ batch?: boolean }, unknown, unknown, Error>
  >()
  expectTypeOf(utils.nested.pong).toMatchTypeOf<
    ProcedureUtils<{ batch?: boolean }, unknown, unknown, Error>
  >()
})
