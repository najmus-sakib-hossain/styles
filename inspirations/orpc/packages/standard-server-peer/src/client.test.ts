import { isAsyncIteratorObject } from '@orpc/shared'
import { getEventMeta, withEventMeta } from '@orpc/standard-server'
import { ClientPeer } from './client'
import { decodeRequestMessage, encodeResponseMessage, MessageType } from './codec'

describe('clientPeer', () => {
  const send = vi.fn()
  let peer: ClientPeer

  beforeEach(() => {
    send.mockReset()
    peer = new ClientPeer(send)
  })

  afterEach(() => {
    expect(peer.length).toBe(0)
  })

  const baseRequest = {
    url: new URL('https://example.com'),
    method: 'POST',
    headers: {
      'x-request': '1',
    },
    body: { hello: 'world' },
    signal: undefined,
  }

  const baseResponse = {
    status: 200,
    headers: {
      'x-response': '1',
    },
    body: { hello: 'world_2' },
  }

  it('simple request/response', async () => {
    expect(peer.request(baseRequest)).resolves.toEqual(baseResponse)

    await vi.waitFor(() => expect(send).toHaveBeenCalledTimes(1))
    expect(await decodeRequestMessage(send.mock.calls[0]![0])).toEqual(['0', MessageType.REQUEST, baseRequest])

    peer.message(await encodeResponseMessage('0', MessageType.RESPONSE, baseResponse))
  })

  it('multiple simple request/response', async () => {
    expect(peer.request(baseRequest)).resolves.toEqual(baseResponse)
    expect(peer.request({ ...baseRequest, body: '__SECOND__' })).resolves.toEqual({ ...baseResponse, body: '__SECOND__' })

    await vi.waitFor(() => expect(send).toHaveBeenCalledTimes(2))
    expect(await decodeRequestMessage(send.mock.calls[0]![0])).toEqual(['0', MessageType.REQUEST, baseRequest])
    expect(await decodeRequestMessage(send.mock.calls[1]![0])).toEqual(['1', MessageType.REQUEST, { ...baseRequest, body: '__SECOND__' }])

    peer.message(await encodeResponseMessage('0', MessageType.RESPONSE, baseResponse))
    peer.message(await encodeResponseMessage('1', MessageType.RESPONSE, { ...baseResponse, body: '__SECOND__' }))
  })

  describe('request', () => {
    it('aborted signal', async () => {
      const controller = new AbortController()
      const signal = controller.signal
      controller.abort()

      const request = {
        ...baseRequest,
        signal,
      }

      await expect(peer.request(request)).rejects.toThrow('This operation was aborted')
      expect(send).toHaveBeenCalledTimes(0)

      await peer.message(await encodeResponseMessage('0', MessageType.RESPONSE, baseResponse))
    })

    it('signal', async () => {
      const controller = new AbortController()
      const signal = controller.signal

      const request = {
        ...baseRequest,
        signal,
      }

      send.mockImplementationOnce(async () => {
        await new Promise(resolve => setTimeout(resolve, 10))
      })

      expect(peer.request(request)).rejects.toThrow('This operation was aborted')
      await new Promise(resolve => setTimeout(resolve, 0))
      controller.abort()

      await vi.waitFor(() => expect(send).toHaveBeenCalledTimes(2))
      expect(await decodeRequestMessage(send.mock.calls[0]![0])).toEqual(['0', MessageType.REQUEST, baseRequest])
      expect(await decodeRequestMessage(send.mock.calls[1]![0])).toEqual(['0', MessageType.ABORT_SIGNAL, undefined])

      await peer.message(await encodeResponseMessage('0', MessageType.RESPONSE, baseResponse))
    })

    it('signal 2', async () => {
      const controller = new AbortController()
      const signal = controller.signal

      const request = {
        ...baseRequest,
        signal,
      }

      send.mockImplementationOnce(async () => {
        await new Promise(resolve => setTimeout(resolve, 10))
      })

      expect(peer.request(request)).rejects.toThrow('This operation was aborted')

      await vi.waitFor(() => expect(send).toHaveBeenCalledTimes(1))
      expect(await decodeRequestMessage(send.mock.calls[0]![0])).toEqual(['0', MessageType.REQUEST, baseRequest])

      controller.abort()
      await vi.waitFor(() => expect(send).toHaveBeenCalledTimes(2))
      expect(await decodeRequestMessage(send.mock.calls[1]![0])).toEqual(['0', MessageType.ABORT_SIGNAL, undefined])

      await peer.message(await encodeResponseMessage('0', MessageType.RESPONSE, baseResponse))
    })

    it('iterator', async () => {
      const request = {
        ...baseRequest,
        body: (async function* () {
          yield 'hello'
          yield withEventMeta({ hello2: true }, { id: 'id-1' })
        })(),
      }

      expect(peer.request(request)).resolves.toEqual(baseResponse)

      await vi.waitFor(() => expect(send).toHaveBeenCalledTimes(4))
      expect(await decodeRequestMessage(send.mock.calls[0]![0]))
        .toEqual(['0', MessageType.REQUEST, { ...request, body: undefined, headers: { ...request.headers, 'content-type': 'text/event-stream' } }])
      expect(await decodeRequestMessage(send.mock.calls[1]![0])).toEqual(['0', MessageType.EVENT_ITERATOR, { event: 'message', data: 'hello' }])
      expect(await decodeRequestMessage(send.mock.calls[2]![0])).toEqual(['0', MessageType.EVENT_ITERATOR, { event: 'message', data: { hello2: true }, meta: { id: 'id-1' } }])
      expect(await decodeRequestMessage(send.mock.calls[3]![0])).toEqual(['0', MessageType.EVENT_ITERATOR, { event: 'done' }])

      peer.message(await encodeResponseMessage('0', MessageType.RESPONSE, baseResponse))
    })

    it('iterator and server abort while sending', async () => {
      const yieldFn = vi.fn(v => v)
      let isFinallyCalled = false

      const request = {
        ...baseRequest,
        body: (async function* () {
          try {
            while (true) {
              yield yieldFn('hello')
              await new Promise(resolve => setTimeout(resolve, 10))
            }
          }
          finally {
            isFinallyCalled = true
          }
        })(),
      }

      expect(peer.request(request)).resolves.toEqual(baseResponse)

      await new Promise(resolve => setTimeout(resolve, 0))

      expect(send).toHaveBeenCalledTimes(2)
      expect(yieldFn).toHaveBeenCalledTimes(1)
      expect(isFinallyCalled).toBe(false)

      await peer.message(await encodeResponseMessage('0', MessageType.ABORT_SIGNAL, undefined))
      await new Promise(resolve => setTimeout(resolve, 20))

      expect(send).toHaveBeenCalledTimes(2)
      expect(yieldFn).toHaveBeenCalledTimes(2)
      expect(isFinallyCalled).toBe(true)

      await peer.message(await encodeResponseMessage('0', MessageType.RESPONSE, baseResponse))
      await new Promise(resolve => setTimeout(resolve, 20))

      expect(send).toHaveBeenCalledTimes(2)
      expect(yieldFn).toHaveBeenCalledTimes(2)
      expect(isFinallyCalled).toBe(true)
    })

    it('file', async () => {
      const request = {
        ...baseRequest,
        body: new File(['hello'], 'hello.txt', { type: 'text/plain' }),
      }

      expect(peer.request(request)).resolves.toEqual(baseResponse)

      await vi.waitFor(() => expect(send).toHaveBeenCalledTimes(1))
      expect(await decodeRequestMessage(send.mock.calls[0]![0]))
        .toEqual(['0', MessageType.REQUEST, {
          ...request,
          headers: {
            ...request.headers,
            'content-type': 'text/plain',
            'content-disposition': expect.any(String),
          },
        }])

      peer.message(await encodeResponseMessage('0', MessageType.RESPONSE, baseResponse))
    })

    it('form data', async () => {
      const formData = new FormData()
      formData.append('hello', 'world')
      formData.append('file', new File(['hello'], 'hello.txt', { type: 'text/plain' }))

      const request = {
        ...baseRequest,
        body: formData,
      }

      expect(peer.request(request)).resolves.toEqual(baseResponse)

      await vi.waitFor(() => expect(send).toHaveBeenCalledTimes(1))
      expect(await decodeRequestMessage(send.mock.calls[0]![0]))
        .toEqual(['0', MessageType.REQUEST, {
          ...request,
          headers: {
            ...request.headers,
            'content-type': expect.stringMatching(/^multipart\/form-data; boundary=/),
          },
        }])

      peer.message(await encodeResponseMessage('0', MessageType.RESPONSE, baseResponse))
    })

    it('throw if can not send', async () => {
      send.mockImplementation(() => {
        throw new Error('send error')
      })
      await expect(peer.request(baseRequest)).rejects.toThrow('send error')
    })

    it('throw if cannot send signal', async () => {
      let time = 0
      send.mockImplementation(() => {
        if (time++ === 1) {
          throw new Error('send error')
        }
      })

      const controller = new AbortController()

      expect(peer.request({ ...baseRequest, signal: controller.signal })).rejects.toThrow()
      controller.abort()
      await vi.waitFor(() => expect(send).toHaveBeenCalledTimes(2))
    })

    it('throw if cannot send iterator', async () => {
      let time = 0
      send.mockImplementation(() => {
        if (time++ === 1) {
          throw new Error('send error')
        }
      })

      const yieldFn = vi.fn(v => v)
      let iteratorError
      let isFinallyCalled = false

      const iterator = (async function* () {
        try {
          yield yieldFn('hello')
          await new Promise(resolve => setTimeout(resolve, 100))
          yield yieldFn('hello2')
          yield yieldFn('hello3')
        }
        catch (e) {
          iteratorError = e
        }
        finally {
          isFinallyCalled = true
          // eslint-disable-next-line no-unsafe-finally
          throw new Error('should silence ignored')
        }
      })()

      const assertPromise = expect(peer.request({ ...baseRequest, body: iterator })).rejects.toThrow('send error')

      await new Promise(resolve => setTimeout(resolve, 0))

      expect(send).toHaveBeenCalledTimes(2)
      await assertPromise
      await new Promise(resolve => setTimeout(resolve, 100))
      expect(send).toHaveBeenCalledTimes(2)
      expect(yieldFn).toHaveBeenCalledTimes(1)
      expect(isFinallyCalled).toBe(true)
      expect(iteratorError).toBe(undefined)
    })
  })

  describe('response', () => {
    it('iterator', async () => {
      const response = {
        ...baseResponse,
        body: (async function* () {})(),
      }

      const responsePromise = peer.request(baseRequest)

      await new Promise(resolve => setTimeout(resolve, 0))

      peer.message(await encodeResponseMessage('0', MessageType.RESPONSE, response))
      peer.message(await encodeResponseMessage('0', MessageType.EVENT_ITERATOR, { event: 'message', data: 'hello' }))
      peer.message(await encodeResponseMessage('0', MessageType.EVENT_ITERATOR, { event: 'message', data: { hello2: true }, meta: { id: 'id-1' } }))
      peer.message(await encodeResponseMessage('0', MessageType.EVENT_ITERATOR, { event: 'done', data: 'hello3' }))

      const result = await responsePromise

      expect(result.status).toBe(response.status)
      expect(result.headers).toEqual({
        ...response.headers,
        'content-type': 'text/event-stream',
      })

      const iterator = result.body as AsyncGenerator

      expect(iterator).toSatisfy(isAsyncIteratorObject)

      expect(await iterator.next()).toSatisfy(({ done, value }) => {
        expect(done).toBe(false)
        expect(value).toEqual('hello')

        return true
      })

      expect(await iterator.next()).toSatisfy(({ done, value }) => {
        expect(done).toBe(false)
        expect(value).toEqual({ hello2: true })
        expect(getEventMeta(value)).toEqual({ id: 'id-1' })

        return true
      })

      expect(await iterator.next()).toSatisfy(({ done, value }) => {
        expect(done).toBe(true)
        expect(value).toEqual('hello3')

        return true
      })

      expect(await iterator.next()).toEqual({ done: true, value: undefined })
    })

    it('iterator and client manually .return while sending', async () => {
      const response = {
        ...baseResponse,
        body: (async function* () { })(),
      }

      const responsePromise = peer.request(baseRequest)

      await new Promise(resolve => setTimeout(resolve, 0))

      peer.message(await encodeResponseMessage('0', MessageType.RESPONSE, response))
      peer.message(await encodeResponseMessage('0', MessageType.EVENT_ITERATOR, { event: 'message', data: 'hello' }))

      const result = await responsePromise

      expect(result.status).toBe(response.status)
      expect(result.headers).toEqual({
        ...response.headers,
        'content-type': 'text/event-stream',
      })

      const iterator = result.body as AsyncGenerator

      expect(iterator).toSatisfy(isAsyncIteratorObject)

      expect(await iterator.next()).toSatisfy(({ done, value }) => {
        expect(done).toBe(false)
        expect(value).toEqual('hello')

        return true
      })

      expect(await iterator.return?.(undefined)).toEqual({ done: true, value: undefined })
      expect(await iterator.next()).toEqual({ done: true, value: undefined })

      expect(send).toHaveBeenCalledTimes(2)
      expect(await decodeRequestMessage(send.mock.calls[1]![0])).toEqual(['0', MessageType.ABORT_SIGNAL, undefined])
    })

    it('iterator and server success response while sending', async () => {
      const yieldFn = vi.fn(v => v)
      let isFinallyCalled = false

      const request = {
        ...baseRequest,
        body: (async function* () {
          try {
            while (true) {
              yield yieldFn('hello')
              await new Promise(resolve => setTimeout(resolve, 10))
            }
          }
          finally {
            isFinallyCalled = true
          }
        })(),
      }

      expect(peer.request(request)).resolves.toEqual(baseResponse)

      await new Promise(resolve => setTimeout(resolve, 0))

      expect(send).toHaveBeenCalledTimes(2)
      expect(yieldFn).toHaveBeenCalledTimes(1)
      expect(isFinallyCalled).toBe(false)

      await peer.message(await encodeResponseMessage('0', MessageType.RESPONSE, baseResponse))
      await new Promise(resolve => setTimeout(resolve, 20))

      expect(send).toHaveBeenCalledTimes(2)
      expect(yieldFn).toHaveBeenCalledTimes(2)
      expect(isFinallyCalled).toBe(true)

      await new Promise(resolve => setTimeout(resolve, 20))

      expect(send).toHaveBeenCalledTimes(2)
      expect(yieldFn).toHaveBeenCalledTimes(2)
      expect(isFinallyCalled).toBe(true)
    })

    it('iterator and server success iterator response while sending', async () => {
      const yieldFn = vi.fn(v => v)
      let isFinallyCalled = false

      const request = {
        ...baseRequest,
        body: (async function* () {
          try {
            while (true) {
              yield yieldFn('hello')
              await new Promise(resolve => setTimeout(resolve, 10))
            }
          }
          finally {
            isFinallyCalled = true
          }
        })(),
      }

      const [response] = await Promise.all([
        peer.request(request),
        new Promise(resolve => setTimeout(resolve, 0))
          .then(async () => peer.message(await encodeResponseMessage('0', MessageType.RESPONSE, { ...baseResponse, body: (async function* () { })() }))),
      ])

      const iterator = response.body as AsyncGenerator

      expect(send).toHaveBeenCalledTimes(2)
      expect(yieldFn).toHaveBeenCalledTimes(1)
      expect(isFinallyCalled).toBe(false)

      await new Promise(resolve => setTimeout(resolve, 10))

      expect(send).toHaveBeenCalledTimes(3)
      expect(yieldFn).toHaveBeenCalledTimes(2)
      expect(isFinallyCalled).toBe(false)

      await peer.message(await encodeResponseMessage('0', MessageType.EVENT_ITERATOR, { event: 'done', data: 'hello' }))
      await iterator.next()
      await new Promise(resolve => setTimeout(resolve, 10))

      expect(send).toHaveBeenCalledTimes(3)
      expect(yieldFn).toHaveBeenCalledTimes(3)
      expect(isFinallyCalled).toBe(true)

      await new Promise(resolve => setTimeout(resolve, 10))

      expect(send).toHaveBeenCalledTimes(3)
      expect(yieldFn).toHaveBeenCalledTimes(3)
      expect(isFinallyCalled).toBe(true)
    })

    it('file', async () => {
      const response = {
        ...baseResponse,
        body: new File(['hello'], 'hello.txt', { type: 'text/plain' }),
      }

      expect(peer.request(baseRequest)).resolves.toEqual({
        ...response,
        headers: {
          ...response.headers,
          'content-type': 'text/plain',
          'content-disposition': expect.any(String),
        },
      })

      peer.message(await encodeResponseMessage('0', MessageType.RESPONSE, response))
    })

    it('form data', async () => {
      const formData = new FormData()
      formData.append('hello', 'world')
      formData.append('file', new File(['hello'], 'hello.txt', { type: 'text/plain' }))

      const response = {
        ...baseResponse,
        body: formData,
      }

      expect(peer.request(baseRequest)).resolves.toEqual({
        ...response,
        headers: {
          ...response.headers,
          'content-type': expect.stringMatching(/^multipart\/form-data; boundary=/),
        },
      })

      peer.message(await encodeResponseMessage('0', MessageType.RESPONSE, response))
    })
  })

  it('close all', async () => {
    expect(peer.request(baseRequest)).rejects.toThrow('[AsyncIdQueue] Queue[0] was closed or aborted while waiting for pulling.')
    expect(peer.request(baseRequest)).rejects.toThrow('[AsyncIdQueue] Queue[1] was closed or aborted while waiting for pulling.')
    expect(peer.request(baseRequest)).rejects.toThrow('[AsyncIdQueue] Queue[2] was closed or aborted while waiting for pulling.')

    peer.close()
  })
})
