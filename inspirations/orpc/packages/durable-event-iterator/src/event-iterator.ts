import type { ClientLink } from '@orpc/client'
import type { ClientDurableEventIterator } from './client'
import type { DurableEventIteratorObject, InferDurableEventIteratorObjectRPC } from './object'
import type { DurableEventIteratorTokenPayload } from './schemas'
import { AsyncIteratorClass, toArray } from '@orpc/shared'
import { SignJWT } from 'jose'
import { createClientDurableEventIterator } from './client'

export type DurableEventIteratorOptions<
  T extends DurableEventIteratorObject<any, any>,
  RPC extends InferDurableEventIteratorObjectRPC<T>,
> = {
  /**
   * Signing key for the token.
   *
   */
  signingKey: string

  /**
   * Time to live for the token in seconds.
   * After expiration, the token will no longer be valid.
   *
   * @default 24 hours (60 * 60 * 24)
   */
  tokenTTLSeconds?: number

  /**
   * The methods that are allowed to be called remotely.
   * You can use the `rpc` method if you cannot fill this field.
   *
   * @default []
   */
  rpc?: readonly RPC[]
} & (
    T extends DurableEventIteratorObject<any, infer U>
      ? undefined extends U ? {
        /**
         * attachment to the token.
         */
        att?: U
      } : {
        /**
         * attachment to the token.
         */
        att: U
      }
      : never
)

export class DurableEventIterator<
  T extends DurableEventIteratorObject<any, any>,
  RPC extends InferDurableEventIteratorObjectRPC<T> = never,
> implements PromiseLike<ClientDurableEventIterator<T, RPC>> {
  constructor(
    private readonly chn: string,
    private readonly options: DurableEventIteratorOptions<T, RPC>,
  ) {
  }

  /**
   * List of methods that can be called remotely.
   */
  rpc<U extends InferDurableEventIteratorObjectRPC<T>>(...rpc: U[]): Omit<DurableEventIterator<T, U>, 'rpc'> {
    return new DurableEventIterator<T, U>(this.chn, {
      ...this.options,
      rpc,
    })
  }

  then<TResult1 = ClientDurableEventIterator<T, RPC>, TResult2 = never>(
    onfulfilled?: ((value: ClientDurableEventIterator<T, RPC>) => TResult1 | PromiseLike<TResult1>) | null | undefined,
    onrejected?: ((reason: any) => TResult2 | PromiseLike<TResult2>) | null | undefined,
  ): PromiseLike<TResult1 | TResult2> {
    return (async () => {
      const signingKey = new TextEncoder().encode(this.options.signingKey)
      const tokenTTLSeconds = this.options.tokenTTLSeconds ?? 60 * 60 * 24 // 24 hours

      const tokenPayload: Omit<DurableEventIteratorTokenPayload, 'iat' | 'exp'> = {
        chn: this.chn,
        rpc: toArray(this.options.rpc),
        att: this.options.att,
      }

      const token = await new SignJWT(tokenPayload)
        .setProtectedHeader({ alg: 'HS256' })
        .setIssuedAt()
        .setExpirationTime(new Date(Date.now() + tokenTTLSeconds * 1000))
        .sign(signingKey)

      const iterator = new AsyncIteratorClass<any>(
        () => Promise.reject(new Error('[DurableEventIteratorServer] cannot be iterated directly.')),
        () => Promise.reject(new Error('[DurableEventIteratorServer] cannot be cleaned up directly.')),
      )

      const link: ClientLink<object> = {
        call() {
          throw new Error('[DurableEventIteratorServer] cannot call methods directly.')
        },
      }

      const durableIterator = createClientDurableEventIterator(iterator, link, {
        token,
      })

      return durableIterator as ClientDurableEventIterator<T, RPC>
    })().then(onfulfilled, onrejected)
  }
}
