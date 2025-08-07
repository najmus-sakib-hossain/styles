import type { HTTPMethod } from '@orpc/client'
import type { InputStructure, OutputStructure } from './route'

export interface ContractConfig {
  defaultMethod: HTTPMethod
  defaultSuccessStatus: number
  defaultSuccessDescription: string
  defaultInputStructure: InputStructure
  defaultOutputStructure: OutputStructure
}

const DEFAULT_CONFIG: ContractConfig = {
  defaultMethod: 'POST',
  defaultSuccessStatus: 200,
  defaultSuccessDescription: 'OK',
  defaultInputStructure: 'compact',
  defaultOutputStructure: 'compact',
}

export function fallbackContractConfig<T extends keyof ContractConfig>(key: T, value: ContractConfig[T] | undefined): ContractConfig[T] {
  if (value === undefined) {
    return DEFAULT_CONFIG[key]
  }

  return value
}
