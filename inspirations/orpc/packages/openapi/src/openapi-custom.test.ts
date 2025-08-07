import type { OpenAPI } from '@orpc/contract'
import { oc } from '@orpc/contract'
import { os } from '@orpc/server'
import { applyCustomOpenAPIOperation, customOpenAPIOperation, getCustomOpenAPIOperation } from './openapi-custom'

it('customOpenAPIOperation & getCustomOpenAPIOperation', () => {
  const customed = customOpenAPIOperation({ value: 123 }, { security: [{ bearerAuth: [] }] })

  expect(customed).toEqual({ value: 123 })
  expect(getCustomOpenAPIOperation(customed)).toEqual({ security: [{ bearerAuth: [] }] })
})

describe('applyCustomOpenAPIOperation', () => {
  it('no custom operation', () => {
    const procedure = os.handler(() => {})

    const operation: OpenAPI.OperationObject = {
      parameters: [{
        name: 'id',
        in: 'path',
        required: true,
        schema: {
          type: 'string',
        },
      }],
    }

    expect(applyCustomOpenAPIOperation(operation, procedure)).toBe(operation)
  })

  it('custom at errors', () => {
    const contract = oc.errors({
      AUTHENTICATION_FAILED: customOpenAPIOperation({}, {
        security: [{ bearerAuth: [] }],
      }),
      TEST: undefined, // ensure check undefinable error map item
    })

    const operation: OpenAPI.OperationObject = {
      parameters: [{
        name: 'id',
        in: 'path',
        required: true,
        schema: {
          type: 'string',
        },
      }],
    }

    expect(applyCustomOpenAPIOperation(operation, contract)).toEqual({
      ...operation,
      security: [{ bearerAuth: [] }],
    })
  })

  it('custom at middlewares', () => {
    const requiredAuth = os.middleware(({ next }) => next())
    const procedure = os
      .use(customOpenAPIOperation(requiredAuth, {
        security: [{ bearerAuth: [] }],
      }))
      .handler(() => {})

    const operation: OpenAPI.OperationObject = {
      parameters: [{
        name: 'id',
        in: 'path',
        required: true,
        schema: {
          type: 'string',
        },
      }],
    }

    expect(applyCustomOpenAPIOperation(operation, procedure)).toEqual({
      ...operation,
      security: [{ bearerAuth: [] }],
    })
  })

  it('callback override', () => {
    const requiredAuth = os.middleware(({ next }) => next())
    const callback = vi.fn()
    const procedure = os
      .use(customOpenAPIOperation(requiredAuth, callback))
      .handler(() => { })

    const operation: OpenAPI.OperationObject = {
      parameters: [{
        name: 'id',
        in: 'path',
        required: true,
        schema: {
          type: 'string',
        },
      }],
    }

    callback.mockReturnValue('__mocked__')

    expect(applyCustomOpenAPIOperation(operation, procedure)).toEqual('__mocked__')

    expect(callback).toBeCalledTimes(1)
    expect(callback).toBeCalledWith(operation, procedure)
  })
})
