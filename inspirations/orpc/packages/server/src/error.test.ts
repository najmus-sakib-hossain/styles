import type { ErrorMap } from '@orpc/contract'
import { ORPCError } from '@orpc/client'
import * as z from 'zod'
import { outputSchema } from '../../contract/tests/shared'
import { createORPCErrorConstructorMap, validateORPCError } from './error'

describe('createORPCErrorConstructorMap', () => {
  const errors = {
    BAD_GATEWAY: {
      status: 588,
      message: 'default message',
      data: outputSchema,
    },
  }

  const constructors = createORPCErrorConstructorMap(errors)

  it('works', () => {
    const error = constructors.BAD_GATEWAY({ data: { output: 123 }, cause: 'cause' })

    expect(error).toBeInstanceOf(ORPCError)
    expect(error.code).toEqual('BAD_GATEWAY')
    expect(error.status).toBe(588)
    expect(error.defined).toBe(true)
    expect(error.message).toBe('default message')
    expect(error.data).toEqual({ output: 123 })
    expect(error.cause).toBe('cause')
  })

  it('can override message', () => {
    expect(
      constructors.BAD_GATEWAY({ message: 'custom message', data: { output: 123 } }).message,
    ).toBe('custom message')
  })

  it('can arbitrary access', () => {
    // @ts-expect-error - invalid access
    const error = constructors.ANY_THING({ data: 'DATA', message: 'MESSAGE', cause: 'cause' })

    expect(error).toBeInstanceOf(ORPCError)
    expect(error.code).toEqual('ANY_THING')
    expect(error.status).toBe(500)
    expect(error.defined).toBe(false)
    expect(error.message).toBe('MESSAGE')
    expect(error.data).toEqual('DATA')
    expect(error.cause).toBe('cause')
  })

  it('not proxy when access with symbol', () => {
    // @ts-expect-error - invalid access
    expect(constructors[Symbol('something')]).toBeUndefined()
  })
})

describe('validateORPCError', () => {
  const errors: ErrorMap = {
    BAD_GATEWAY: {
      data: z.object({
        value: z.string().transform(v => Number.parseInt(v)),
      }),
    },
    CONFLICT: {
      status: 483,
    },
  }

  it('ignore not-match errors when defined=false', async () => {
    const e1 = new ORPCError('BAD_GATEWAY', { status: 501, data: { value: '123' } })
    expect(await validateORPCError(errors, e1)).toBe(e1)

    const e2 = new ORPCError('NOT_FOUND')
    expect(await validateORPCError(errors, e2)).toBe(e2)

    const e3 = new ORPCError('BAD_GATEWAY', { data: 'invalid' })
    expect(await validateORPCError(errors, e3)).toBe(e3)

    const e4 = new ORPCError('CONFLICT')
    expect(await validateORPCError(errors, e4)).toBe(e4)
  })

  it('modify not-match errors when defined=true', async () => {
    const e1 = new ORPCError('BAD_GATEWAY', { defined: true, status: 501 })
    const v1 = await validateORPCError(errors, e1)
    expect(v1).not.toBe(e1)
    expect({ ...v1 }).toEqual({ ...e1, defined: false })

    const e2 = new ORPCError('NOT_FOUND', { defined: true })
    const v2 = await validateORPCError(errors, e2)
    expect(v2).not.toBe(e2)
    expect({ ...v2 }).toEqual({ ...e2, defined: false })

    const e3 = new ORPCError('BAD_GATEWAY', { defined: true, data: 'invalid' })
    const v3 = await validateORPCError(errors, e3)
    expect(v3).not.toBe(e3)
    expect({ ...v3 }).toEqual({ ...e3, defined: false })

    const e4 = new ORPCError('CONFLICT', { defined: true })
    const v4 = await validateORPCError(errors, e4)
    expect(v4).not.toBe(e4)
    expect({ ...v4 }).toEqual({ ...e4, defined: false })
  })

  it('ignore match errors when defined=true and data schema is undefined', async () => {
    const e1 = new ORPCError('CONFLICT', { defined: true, status: 483 })
    expect(await validateORPCError(errors, e1)).toBe(e1)
  })

  it('return new error when defined=true and data schema is undefined with match error', async () => {
    const e1 = new ORPCError('CONFLICT', { status: 483 })
    const v1 = await validateORPCError(errors, e1)
    expect(v1).not.toBe(e1)
    expect({ ...v1 }).toEqual({ ...e1, defined: true })
  })

  it('return new with defined=true and validated data with match errors', async () => {
    const e1 = new ORPCError('BAD_GATEWAY', { data: { value: '123' } })
    const v1 = await validateORPCError(errors, e1)
    expect(v1).not.toBe(e1)
    expect({ ...v1 }).toEqual({ ...e1, defined: true, data: { value: 123 } })
  })
})
