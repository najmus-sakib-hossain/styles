import { getMalformedResponseErrorCode, toHttpPath } from './utils'

it('convertPathToHttpPath', () => {
  expect(toHttpPath(['ping'])).toEqual('/ping')
  expect(toHttpPath(['nested', 'ping'])).toEqual('/nested/ping')
  expect(toHttpPath(['nested/', 'ping'])).toEqual('/nested%2F/ping')
})

it('getMalformedResponseErrorCode', () => {
  expect(getMalformedResponseErrorCode(400)).toEqual('BAD_REQUEST')
  expect(getMalformedResponseErrorCode(401)).toEqual('UNAUTHORIZED')
  expect(getMalformedResponseErrorCode(433)).toEqual('MALFORMED_ORPC_ERROR_RESPONSE')
})
