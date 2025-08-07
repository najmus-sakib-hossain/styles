import type { ErrorFromErrorMap } from '@orpc/contract'
import type { RouterClient } from '@orpc/server'
import type { baseErrorMap } from '../../contract/tests/shared'
import type { router } from '../../server/tests/shared'
import type { GeneralUtils } from './general-utils'
import type { ProcedureUtils } from './procedure-utils'
import type { RouterUtils } from './router-utils'

it('RouterUtils', () => {
  const utils = {} as RouterUtils<RouterClient<typeof router, { batch?: boolean }>>

  expectTypeOf(utils).toExtend<GeneralUtils<unknown>>()
  expectTypeOf(utils.nested).toExtend<GeneralUtils<unknown>>()

  expectTypeOf(utils.ping).toExtend<GeneralUtils<{ input: number }>>()
  expectTypeOf(utils.nested.ping).toExtend<GeneralUtils<{ input: number }>>()

  expectTypeOf(utils.ping).toExtend<
    ProcedureUtils<{ batch?: boolean }, { input: number }, { output: string }, ErrorFromErrorMap<typeof baseErrorMap>>
  >()
  expectTypeOf(utils.nested.ping).toExtend<
    ProcedureUtils<{ batch?: boolean }, { input: number }, { output: string }, ErrorFromErrorMap<typeof baseErrorMap>>
  >()

  expectTypeOf(utils.pong).toExtend<
    ProcedureUtils<{ batch?: boolean }, unknown, unknown, Error>
  >()
  expectTypeOf(utils.nested.pong).toExtend<
    ProcedureUtils<{ batch?: boolean }, unknown, unknown, Error>
  >()
})
