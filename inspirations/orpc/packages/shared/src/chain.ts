import type { AnyFunction } from './function'

export type OmitChainMethodDeep<T extends object, K extends keyof any> = {
  [P in keyof Omit<T, K>]: T[P] extends AnyFunction
    ? ((...args: Parameters<T[P]>) => OmitChainMethodDeep<ReturnType<T[P]>, K>)
    : T[P]
}
