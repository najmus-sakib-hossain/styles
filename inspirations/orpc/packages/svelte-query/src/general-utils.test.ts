import * as keyModule from '@orpc/tanstack-query'
import { createGeneralUtils } from './general-utils'

const generateOperationKeySpy = vi.spyOn(keyModule, 'generateOperationKey')

beforeEach(() => {
  vi.clearAllMocks()
})

describe('createGeneralUtils', () => {
  const utils = createGeneralUtils(['path'])

  it('.key', () => {
    expect(utils.key({ input: { search: '__search__' }, type: 'infinite' })).toEqual([['path'], { input: { search: '__search__' }, type: 'infinite' }])
    expect(generateOperationKeySpy).toHaveBeenCalledTimes(1)
    expect(generateOperationKeySpy).toHaveBeenCalledWith(['path'], { input: { search: '__search__' }, type: 'infinite' })
  })
})
