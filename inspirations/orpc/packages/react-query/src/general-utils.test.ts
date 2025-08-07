import * as TanstackQueryModule from '@orpc/tanstack-query'
import { createGeneralUtils } from './general-utils'

const generateOperationKeyOptions = vi.spyOn(TanstackQueryModule, 'generateOperationKey')

beforeEach(() => {
  vi.clearAllMocks()
})

describe('createGeneralUtils', () => {
  const utils = createGeneralUtils(['path'])

  it('.key', () => {
    expect(utils.key({ input: { search: '__search__' }, type: 'infinite' })).toEqual([['path'], { input: { search: '__search__' }, type: 'infinite' }])
    expect(generateOperationKeyOptions).toHaveBeenCalledTimes(1)
    expect(generateOperationKeyOptions).toHaveBeenCalledWith(['path'], { input: { search: '__search__' }, type: 'infinite' })
  })
})
