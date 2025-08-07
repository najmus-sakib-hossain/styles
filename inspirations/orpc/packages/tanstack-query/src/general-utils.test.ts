import { createGeneralUtils } from './general-utils'
import * as KeyModule from './key'

const generateOperationKeySpy = vi.spyOn(KeyModule, 'generateOperationKey')

beforeEach(() => {
  vi.clearAllMocks()
})

describe('createGeneralUtils', () => {
  const utils = createGeneralUtils(['path'])

  it('.key', () => {
    expect(
      utils.key({ input: { search: '__search__' }, type: 'infinite' }),
    ).toBe(generateOperationKeySpy.mock.results[0]!.value)

    expect(generateOperationKeySpy).toHaveBeenCalledTimes(1)
    expect(generateOperationKeySpy).toHaveBeenCalledWith(['path'], { input: { search: '__search__' }, type: 'infinite' })
  })
})
