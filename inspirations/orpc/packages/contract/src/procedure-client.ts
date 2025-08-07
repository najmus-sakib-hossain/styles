import type { Client, ClientContext } from '@orpc/client'
import type { ErrorFromErrorMap, ErrorMap } from './error'
import type { AnySchema, InferSchemaInput, InferSchemaOutput } from './schema'

export type ContractProcedureClient<
  TClientContext extends ClientContext,
  TInputSchema extends AnySchema,
  TOutputSchema extends AnySchema,
  TErrorMap extends ErrorMap,
> = Client<TClientContext, InferSchemaInput<TInputSchema>, InferSchemaOutput<TOutputSchema>, ErrorFromErrorMap<TErrorMap>>
