import { baseErrorMap } from '../tests/shared'
import { mergeErrorMap, ValidationError } from './error'

it('validationError', () => {
  const error = new ValidationError({ message: 'message', issues: [{ message: 'message' }] })
  expect(error).toBeInstanceOf(Error)
  expect(error.issues).toEqual([{ message: 'message' }])
})

it('mergeErrorMap', () => {
  expect(mergeErrorMap(baseErrorMap, baseErrorMap)).toEqual(baseErrorMap)
  expect(mergeErrorMap(baseErrorMap, { OVERRIDE: {}, INVALID: {} })).toEqual(
    { OVERRIDE: {}, INVALID: {}, BASE: baseErrorMap.BASE },
  )
})
