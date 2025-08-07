import { os } from './builder'
import { inferRPCMethodFromRouter } from './link-utils'

it('inferRPCMethodFromRouter', async () => {
  const method = inferRPCMethodFromRouter({
    head: os.route({ method: 'HEAD' }).handler(() => {}),
    get: os.route({ method: 'GET' }).handler(() => { }),
    post: os.route({}).handler(() => { }),
    nested: os.lazy(() => Promise.resolve({
      default: {
        get: os.lazy(() => Promise.resolve({ default: os.route({ method: 'GET' }).handler(() => { }) })),
        delete: os.route({ method: 'DELETE' }).handler(() => { }),
      },
    })),
  })

  expect(await method({}, ['head'])).toBe('GET')
  expect(await method({}, ['get'])).toBe('GET')
  expect(await method({}, ['post'])).toBe('POST')
  expect(await method({}, ['nested', 'get'])).toBe('GET')
  expect(await method({}, ['nested', 'delete'])).toBe('DELETE')

  await expect(method({}, ['nested', 'not-exist'])).rejects.toThrow(/No valid procedure found at path/)
})
