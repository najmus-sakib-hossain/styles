import type { DynamicModule } from '@nestjs/common'
import type { AnySchema } from '@orpc/contract'
import type { CreateProcedureClientOptions } from '@orpc/server'
import type { SendStandardResponseOptions } from '@orpc/standard-server-node'
import { Module } from '@nestjs/common'
import { ImplementInterceptor } from './implement'

export const ORPC_MODULE_CONFIG_SYMBOL = Symbol('ORPC_MODULE_CONFIG')

export interface ORPCModuleConfig extends
  CreateProcedureClientOptions<object, AnySchema, object, object, object>,
  SendStandardResponseOptions {
}

@Module({})
export class ORPCModule {
  static forRoot(config: ORPCModuleConfig): DynamicModule {
    return {
      module: ORPCModule,
      providers: [
        {
          provide: ORPC_MODULE_CONFIG_SYMBOL,
          useValue: config,
        },
        ImplementInterceptor,
      ],
      exports: [ORPC_MODULE_CONFIG_SYMBOL, ImplementInterceptor],
      global: true,
    }
  }
}
