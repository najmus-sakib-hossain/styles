import { fallbackContractConfig } from './config'

it('fallbackConfig', () => {
  expect(fallbackContractConfig('defaultMethod', undefined)).toBe('POST')
  expect(fallbackContractConfig('defaultMethod', 'GET')).toBe('GET')
})
