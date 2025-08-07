import { createORPCErrorFromJson, fallbackORPCErrorMessage, fallbackORPCErrorStatus, isDefinedError, isORPCErrorJson, isORPCErrorStatus, ORPCError, toORPCError } from './error'

it('fallbackORPCErrorStatus', () => {
  expect(fallbackORPCErrorStatus('BAD_GATEWAY', 500)).toBe(500)
  expect(fallbackORPCErrorStatus('BAD_GATEWAY', undefined)).toBe(502)
  expect(fallbackORPCErrorStatus('ANYTHING', 405)).toBe(405)
  expect(fallbackORPCErrorStatus('ANYTHING', undefined)).toBe(500)
})

it('fallbackORPCErrorMessage', () => {
  expect(fallbackORPCErrorMessage('BAD_GATEWAY', 'message')).toBe('message')
  expect(fallbackORPCErrorMessage('BAD_GATEWAY', undefined)).toBe('Bad Gateway')
  expect(fallbackORPCErrorMessage('ANYTHING', 'message')).toBe('message')
  expect(fallbackORPCErrorMessage('ANYTHING', undefined)).toBe('ANYTHING')
})

describe('oRPCError', () => {
  it('works', () => {
    const error = new ORPCError('BAD_GATEWAY', { defined: true, status: 500, message: 'message', data: 'data', cause: 'cause' })
    expect(error.defined).toBe(true)
    expect(error.code).toBe('BAD_GATEWAY')
    expect(error.status).toBe(500)
    expect(error.message).toBe('message')
    expect(error.data).toBe('data')
    expect(error.cause).toBe('cause')
  })

  it('default defined=false', () => {
    const error = new ORPCError('BAD_GATEWAY')
    expect(error.defined).toBe(false)
  })

  it('fallback status', () => {
    const error = new ORPCError('BAD_GATEWAY')
    expect(error.status).toBe(502)
  })

  it('fallback message', () => {
    const error = new ORPCError('BAD_GATEWAY')
    expect(error.message).toBe('Bad Gateway')
  })

  it('oRPCError throw when invalid status', () => {
    expect(() => new ORPCError('BAD_GATEWAY', { status: 200 })).toThrowError()
    expect(() => new ORPCError('BAD_GATEWAY', { status: 399 })).toThrowError()

    expect(() => new ORPCError('BAD_GATEWAY', { status: 400 })).not.toThrowError()
    expect(() => new ORPCError('BAD_GATEWAY', { status: 199 })).not.toThrowError()
  })

  it('toJSON', () => {
    const error = new ORPCError('BAD_GATEWAY', { status: 500, message: 'message', data: 'data', cause: 'cause' })
    expect(error.toJSON()).toEqual({
      defined: false,
      code: 'BAD_GATEWAY',
      status: 500,
      message: 'message',
      data: 'data',
    })
  })
})

it('isDefinedError', () => {
  expect(isDefinedError(new ORPCError('BAD_GATEWAY'))).toBe(false)
  expect(isDefinedError(new ORPCError('BAD_GATEWAY', { defined: true }))).toBe(true)
  expect(isDefinedError({ defined: true, code: 'BAD_GATEWAY' })).toBe(false)
})

it('toORPCError', () => {
  const orpcError = new ORPCError('BAD_GATEWAY')
  expect(toORPCError(orpcError)).toBe(orpcError)

  const error = new Error('error')
  expect(toORPCError(error)).toSatisfy((value: any) => {
    expect(value).toBeInstanceOf(ORPCError)
    expect(value.code).toEqual('INTERNAL_SERVER_ERROR')
    expect(value.status).toBe(500)
    expect(value.defined).toBe(false)
    expect(value.message).toBe('Internal server error')
    expect(value.data).toBe(undefined)
    expect(value.cause).toBe(error)

    return true
  })
})

it('isORPCErrorStatus', () => {
  expect(isORPCErrorStatus(200)).toBe(false)
  expect(isORPCErrorStatus(399)).toBe(false)

  expect(isORPCErrorStatus(400)).toBe(true)
  expect(isORPCErrorStatus(499)).toBe(true)
  expect(isORPCErrorStatus(199)).toBe(true)
})

it('createORPCErrorFromJson', () => {
  const error = createORPCErrorFromJson({
    defined: true,
    code: 'BAD_GATEWAY',
    status: 500,
    message: 'message',
    data: 'data',
  }, {
    cause: 'cause',
  })
  expect(error.defined).toBe(true)
  expect(error.code).toBe('BAD_GATEWAY')
  expect(error.status).toBe(500)
  expect(error.message).toBe('message')
  expect(error.data).toBe('data')
  expect(error.cause).toBe('cause')
})

it('isValidJSON', () => {
  const error = new ORPCError('BAD_GATEWAY', { status: 500, message: 'message', data: 'data', cause: 'cause' })
  expect(isORPCErrorJson(error.toJSON())).toBe(true)
  expect(isORPCErrorJson(`error`)).toBe(false)
  expect(isORPCErrorJson({})).toBe(false)
  expect(isORPCErrorJson({ defined: true })).toBe(false)
  expect(isORPCErrorJson({ defined: true, code: 'BAD_GATEWAY', status: 500, message: 'message', data: 'data' })).toBe(true)
  expect(isORPCErrorJson({ defined: true, code: 'BAD_GATEWAY', status: 200, message: 'message', data: 'data' })).toBe(false)
  expect(isORPCErrorJson({ defined: true, code: 'BAD_GATEWAY', status: 500, message: 'message', data: 'data', extra: true })).toBe(false)
})
