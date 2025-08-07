import { ping } from '../tests/shared'
import { getLazyMeta, isLazy, lazy, unlazy } from './lazy'

it('lazy & isLazy & getLazyMeta & unlazy ', () => {
  const lazied = lazy(() => Promise.resolve({ default: ping }), { prefix: '/adapt' })
  expect(lazied).toSatisfy(isLazy)
  expect(unlazy(lazied)).resolves.toEqual({ default: ping })
  expect(getLazyMeta(lazied)).toEqual({ prefix: '/adapt' })

  expect({}).not.toSatisfy(isLazy)
  expect(true).not.toSatisfy(isLazy)
  expect(unlazy(123)).resolves.toEqual({ default: 123 })
})
