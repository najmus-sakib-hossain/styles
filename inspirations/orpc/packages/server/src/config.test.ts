import { fallbackConfig } from './config'

it('fallbackConfig', () => {
  expect(fallbackConfig('initialInputValidationIndex', 1)).toBe(1)
  expect(fallbackConfig('initialInputValidationIndex', undefined)).toBe(0)
})
