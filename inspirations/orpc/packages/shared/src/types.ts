export type SetOptional<T, K extends keyof T> = Omit<T, K> & Partial<Pick<T, K>>

export type IntersectPick<T, U> = Pick<T, keyof T & keyof U>

export type PromiseWithError<T, TError> = Promise<T> & { __error?: { type: TError } }

/**
 * The place where you can config the orpc types.
 *
 * - `throwableError` the error type that represent throwable errors should be `Error` or `null | undefined | {}` if you want more strict.
 */
export interface Registry {

}

export type ThrowableError = Registry extends { throwableError: infer T } ? T : Error
