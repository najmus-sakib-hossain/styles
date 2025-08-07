import { createGeneralUtils } from './general-utils'
import * as keyModule from './key'

const buildKeySpy = vi.spyOn(keyModule, 'buildKey')

beforeEach(() => {
  vi.clearAllMocks()
})

describe('createGeneralUtils', () => {
  const utils = createGeneralUtils(['path'])

  it('.key', () => {
    expect(
      utils.key({ input: { search: '__search__' } }),
    ).toEqual(
      buildKeySpy.mock.results[0]!.value,
    )

    expect(buildKeySpy).toHaveBeenCalledTimes(1)
    expect(buildKeySpy).toHaveBeenCalledWith(['path'], { input: { search: '__search__' } })
  })
})
