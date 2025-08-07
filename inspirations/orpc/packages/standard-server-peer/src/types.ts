import type { Promisable } from '@orpc/shared'

export type EncodedMessage = string | ArrayBufferLike | Uint8Array

export interface EncodedMessageSendFn {
  (message: EncodedMessage): Promisable<void>
}
