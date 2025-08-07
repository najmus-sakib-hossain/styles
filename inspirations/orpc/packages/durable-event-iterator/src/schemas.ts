import * as v from 'valibot'

export type DurableEventIteratorTokenPayload = v.InferOutput<typeof DurableEventIteratorTokenPayloadSchema>

export const DurableEventIteratorTokenPayloadSchema = v.pipe(
  v.object({
    chn: v.string(), // Channel name
    att: v.optional(v.any()), // Attachment
    rpc: v.pipe(v.array(v.string()), v.readonly()), // Remote method calls (allowed methods)
    iat: v.number(), // Issued at time in seconds
    exp: v.number(), // Expiration time in seconds
  }),
  v.transform(value => ({
    att: undefined,
    ...value,
  })),
)
