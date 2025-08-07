import { readAsBuffer } from './buffer'

it('readAsBuffer', async () => {
  const blob = new Blob(['test'], { type: 'text/plain' })

  expect(new TextDecoder().decode(await readAsBuffer(blob))).toBe('test')
  expect(new TextDecoder().decode(await readAsBuffer(new Proxy(blob, {
    get: (target, prop) => {
      if (prop === 'bytes') {
        return undefined
      }
      return Reflect.get(target, prop)
    },
  })))).toBe('test')

  expect(new TextDecoder().decode(await readAsBuffer((new Response(blob) as any)))).toBe('test')
})
