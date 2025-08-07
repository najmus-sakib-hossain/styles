import { getEventMeta, ORPCError, os, withEventMeta } from '@orpc/server'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { StandardRPCHandler } from '../../../../server/src/adapters/standard/rpc-handler'
import { supportedDataTypes } from '../../../tests/shared'
import { StandardRPCLink } from './rpc-link'

beforeEach(() => {
  vi.clearAllMocks()
})

describe.each(supportedDataTypes)('standardRPCLink: $name', ({ value, expected }) => {
  describe.each(['GET', 'POST'] as const)('method: %s', (method) => {
    async function assertSuccessCase(value: unknown, expected: unknown): Promise<true> {
      const handler = vi.fn(({ input }) => input)

      const rpcHandler = new StandardRPCHandler(os.handler(handler))

      const rpcLink = new StandardRPCLink({
        async call(request, options, path, input) {
          const { response } = await rpcHandler.handle({ ...request, body: () => Promise.resolve(request.body) }, {
            context: {},
            prefix: '/prefix',
          })

          if (!response) {
            throw new Error('No response')
          }

          return { ...response, body: () => Promise.resolve(response.body) }
        },
      }, {
        method,
        url: new URL('http://localhost/prefix'),
      })

      const output = await rpcLink.call([], value, { context: {} })

      expect(output).toEqual(expected)
      expect(handler).toHaveBeenCalledTimes(1)
      expect(handler).toHaveBeenCalledWith(expect.objectContaining({ input: expected }))

      return true
    }

    async function assertErrorCase(value: unknown, expected: unknown): Promise<true> {
      const handler = vi.fn(({ input }) => {
        throw new ORPCError('TEST', {
          data: input,
        })
      })

      const rpcHandler = new StandardRPCHandler(os.handler(handler))

      const rpcLink = new StandardRPCLink({
        async call(request, options, path, input) {
          const { response } = await rpcHandler.handle({ ...request, body: () => Promise.resolve(request.body) }, {
            context: {},
            prefix: '/prefix',
          })

          if (!response) {
            throw new Error('No response')
          }

          return { ...response, body: () => Promise.resolve(response.body) }
        },
      }, {
        url: new URL('http://localhost/prefix'),
      })

      await expect(rpcLink.call([], value, { context: {} })).rejects.toSatisfy((e) => {
        expect(e).toBeInstanceOf(ORPCError)
        expect(e.code).toBe('TEST')
        expect(e.data).toEqual(expected)

        return true
      })

      return true
    }

    it('should work on flat', async () => {
      expect(await assertSuccessCase(value, expected)).toBe(true)
      expect(await assertErrorCase(value, expected)).toBe(true)
    })

    it('should work on nested object', async () => {
      expect(await assertSuccessCase({ data: value }, { data: expected })).toBe(true)
      expect(await assertErrorCase({ data: value }, { data: expected })).toBe(true)
    })

    it('should work on complex object', async () => {
      expect(await assertSuccessCase({
        '!@#$%^^&()[]>?<~_<:"~+!_': value,
        'list': [value],
        'map': new Map([[value, value]]),
        'set': new Set([value]),
        'nested': {
          nested: value,
        },
      }, {
        '!@#$%^^&()[]>?<~_<:"~+!_': expected,
        'list': [expected],
        'map': new Map([[expected, expected]]),
        'set': new Set([expected]),
        'nested': {
          nested: expected,
        },
      })).toBe(true)

      expect(await assertErrorCase({
        '!@#$%^^&()[]>?<~_<:"~+!_': value,
        'list': [value],
        'map': new Map([[value, value]]),
        'set': new Set([value]),
        'nested': {
          nested: value,
        },
      }, {
        '!@#$%^^&()[]>?<~_<:"~+!_': expected,
        'list': [expected],
        'map': new Map([[expected, expected]]),
        'set': new Set([expected]),
        'nested': {
          nested: expected,
        },
      })).toBe(true)
    })
  })
})

describe('standardRPCLink: event-iterator', async () => {
  const handler = vi.fn(({ input }) => input)

  const rpcHandler = new StandardRPCHandler(os.handler(handler))

  const rpcLink = new StandardRPCLink({
    async call(request, options, path, input) {
      const { response } = await rpcHandler.handle({ ...request, body: () => Promise.resolve(request.body) }, {
        context: {},
        prefix: '/prefix',
      })

      if (!response) {
        throw new Error('No response')
      }

      return { ...response, body: () => Promise.resolve(response.body) }
    },
  }, {
    url: new URL('http://localhost/prefix'),
  })

  it('on success', async () => {
    const output = await rpcLink.call([], (async function* () {
      yield 1
      yield withEventMeta({ hello: 2 }, { id: '29224', retry: 8393 })
      return withEventMeta({ hello: 3 }, { id: '391', retry: 28973 })
    })(), { context: {} }) as any

    expect(await output.next()).toEqual({ value: 1, done: false })

    expect(await output.next()).toSatisfy(({ value, done }) => {
      expect(done).toBe(false)
      expect(value).toEqual({ hello: 2 })
      expect(getEventMeta(value)).toEqual({ id: '29224', retry: 8393 })

      return true
    })

    expect(await output.next()).toSatisfy(({ value, done }) => {
      expect(done).toBe(true)
      expect(value).toEqual({ hello: 3 })
      expect(getEventMeta(value)).toEqual({ id: '391', retry: 28973 })

      return true
    })

    expect(await output.next()).toEqual({ value: undefined, done: true })
  })

  it('on error', async () => {
    const output = await rpcLink.call([], (async function* () {
      yield 1
      yield withEventMeta({ hello: 2 }, { id: '29224', retry: 8393 })
      throw withEventMeta(new ORPCError('INTERNAL', {
        data: { hello: 3 },
      }), { id: '391', retry: 28973 })
    })(), { context: {} }) as any

    expect(await output.next()).toEqual({ value: 1, done: false })

    expect(await output.next()).toSatisfy(({ value, done }) => {
      expect(done).toBe(false)
      expect(value).toEqual({ hello: 2 })
      expect(getEventMeta(value)).toEqual({ id: '29224', retry: 8393 })

      return true
    })

    await expect(output.next()).rejects.toSatisfy((err) => {
      expect(err).toBeInstanceOf(ORPCError)
      expect(err.code).toBe('INTERNAL')
      expect(err.data).toEqual({ hello: 3 })
      expect(getEventMeta(err)).toEqual({ id: '391', retry: 28973 })

      return true
    })

    expect(await output.next()).toEqual({ value: undefined, done: true })
  })
})
