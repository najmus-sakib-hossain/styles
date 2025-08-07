import { isAsyncIteratorObject } from '@orpc/shared'
import { getEventMeta, experimental_HibernationEventIterator as HibernationEventIterator, withEventMeta } from '@orpc/standard-server'
import { decodeResponseMessage, encodeRequestMessage, MessageType } from './codec'
import { ServerPeer } from './server'

describe('serverPeer', () => {
  const REQUEST_ID = '1953'

  const send = vi.fn()
  let peer: ServerPeer

  beforeEach(() => {
    send.mockReset()
    peer = new ServerPeer(send)
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
    const [id, request] = await peer.message(await encodeRequestMessage(REQUEST_ID, MessageType.REQUEST, baseRequest))

    expect(id).toBe(REQUEST_ID)
    expect(request).toEqual({
      ...baseRequest,
      signal: expect.any(AbortSignal),
    })

    await peer.response(id, baseResponse)

    expect(send).toHaveBeenCalledTimes(1)
    expect(await decodeResponseMessage(send.mock.calls[0]![0])).toEqual([REQUEST_ID, MessageType.RESPONSE, baseResponse])
  })

  it('multiple simple request/response', async () => {
    const [id, request] = await peer.message(await encodeRequestMessage(REQUEST_ID, MessageType.REQUEST, baseRequest))
    const [id2, request2] = await peer.message(await encodeRequestMessage(REQUEST_ID + 1, MessageType.REQUEST, { ...baseRequest, body: '__SECOND__' }))

    expect(id).toBe(REQUEST_ID)
    expect(request).toEqual({
      ...baseRequest,
      signal: expect.any(AbortSignal),
    })

    expect(id2).toBe(REQUEST_ID + 1)
    expect(request2).toEqual({
      ...baseRequest,
      body: '__SECOND__',
      signal: expect.any(AbortSignal),
    })

    await peer.response(id, baseResponse)
    await peer.response(id2, { ...baseResponse, body: '__SECOND__' })

    expect(send).toHaveBeenCalledTimes(2)
    expect(await decodeResponseMessage(send.mock.calls[0]![0])).toEqual([REQUEST_ID, MessageType.RESPONSE, baseResponse])
    expect(await decodeResponseMessage(send.mock.calls[1]![0])).toEqual([REQUEST_ID + 1, MessageType.RESPONSE, { ...baseResponse, body: '__SECOND__' }])
  })

  describe('request', () => {
    it('signal', async () => {
      const [, request] = await peer.message(await encodeRequestMessage(REQUEST_ID, MessageType.REQUEST, baseRequest))

      const signal = request!.signal!

      expect(signal.aborted).toBe(false)

      await peer.message(await encodeRequestMessage(REQUEST_ID, MessageType.ABORT_SIGNAL, undefined))

      expect(signal.aborted).toBe(true)
    })

    it('iterator', async () => {
      const clientRequest = {
        ...baseRequest,
        body: (async function* () {})(),
      }

      const [, request] = await peer.message(await encodeRequestMessage(REQUEST_ID, MessageType.REQUEST, clientRequest))
      await peer.message(await encodeRequestMessage(REQUEST_ID, MessageType.EVENT_ITERATOR, { event: 'message', data: 'hello' }))
      await peer.message(await encodeRequestMessage(REQUEST_ID, MessageType.EVENT_ITERATOR, { event: 'message', data: { hello2: true }, meta: { id: 'id-1' } }))
      await peer.message(await encodeRequestMessage(REQUEST_ID, MessageType.EVENT_ITERATOR, { event: 'done', data: 'hello3' }))

      expect(request).toEqual({
        ...clientRequest,
        headers: {
          ...clientRequest.headers,
          'content-type': 'text/event-stream',
        },
        body: expect.toSatisfy(isAsyncIteratorObject),
        signal: expect.any(AbortSignal),
      })

      const iterator = request!.body as AsyncGenerator

      await expect(iterator.next()).resolves.toSatisfy(({ done, value }) => {
        expect(done).toBe(false)
        expect(value).toEqual('hello')

        return true
      })

      await expect(iterator.next()).resolves.toSatisfy(({ done, value }) => {
        expect(done).toBe(false)
        expect(value).toEqual({ hello2: true })
        expect(getEventMeta(value)).toEqual({ id: 'id-1' })

        return true
      })

      await expect(iterator.next()).resolves.toSatisfy(({ done, value }) => {
        expect(done).toBe(true)
        expect(value).toEqual('hello3')

        return true
      })

      await expect(iterator.next()).resolves.toEqual({ done: true, value: undefined })

      await peer.response(REQUEST_ID, baseResponse)
    })

    it('iterator with manually .return', async () => {
      const clientRequest = {
        ...baseRequest,
        body: (async function* () { })(),
      }

      const [, request] = await peer.message(await encodeRequestMessage(REQUEST_ID, MessageType.REQUEST, clientRequest))
      await peer.message(await encodeRequestMessage(REQUEST_ID, MessageType.EVENT_ITERATOR, { event: 'message', data: 'hello' }))

      expect(request).toEqual({
        ...clientRequest,
        headers: {
          ...clientRequest.headers,
          'content-type': 'text/event-stream',
        },
        body: expect.toSatisfy(isAsyncIteratorObject),
        signal: expect.any(AbortSignal),
      })

      const iterator = request!.body as AsyncGenerator

      await expect(iterator.next()).resolves.toSatisfy(({ done, value }) => {
        expect(done).toBe(false)
        expect(value).toEqual('hello')

        return true
      })

      await expect(iterator.return(undefined)).resolves.toEqual({ done: true, value: undefined })
      await expect(iterator.next(undefined)).resolves.toEqual({ done: true, value: undefined })

      expect(send).toHaveBeenCalledTimes(1)
      expect(await decodeResponseMessage(send.mock.calls[0]![0])).toEqual([REQUEST_ID, MessageType.ABORT_SIGNAL, undefined])

      await peer.response(REQUEST_ID, baseResponse)
      expect(send).toHaveBeenCalledTimes(2)
    })

    it('iterator with manually .throw', async () => {
      const clientRequest = {
        ...baseRequest,
        body: (async function* () { })(),
      }

      const [, request] = await peer.message(await encodeRequestMessage(REQUEST_ID, MessageType.REQUEST, clientRequest))
      await peer.message(await encodeRequestMessage(REQUEST_ID, MessageType.EVENT_ITERATOR, { event: 'message', data: 'hello' }))

      expect(request).toEqual({
        ...clientRequest,
        headers: {
          ...clientRequest.headers,
          'content-type': 'text/event-stream',
        },
        body: expect.toSatisfy(isAsyncIteratorObject),
        signal: expect.any(AbortSignal),
      })

      const iterator = request!.body as AsyncGenerator

      await expect(iterator.next()).resolves.toSatisfy(({ done, value }) => {
        expect(done).toBe(false)
        expect(value).toEqual('hello')

        return true
      })

      await expect(iterator.throw(new Error('some error'))).rejects.toThrow('some error')
      await expect(iterator.next(undefined)).resolves.toEqual({ done: true, value: undefined })

      expect(send).toHaveBeenCalledTimes(1)
      expect(await decodeResponseMessage(send.mock.calls[0]![0])).toEqual([REQUEST_ID, MessageType.ABORT_SIGNAL, undefined])

      await peer.response(REQUEST_ID, baseResponse)
      expect(send).toHaveBeenCalledTimes(2)
    })

    it('file', async () => {
      const clientRequest = {
        ...baseRequest,
        body: new File(['hello'], 'hello.txt', { type: 'text/plain' }),
      }

      const [id, request] = await peer.message(await encodeRequestMessage(REQUEST_ID, MessageType.REQUEST, clientRequest))

      expect(id).toBe(REQUEST_ID)
      expect(request).toEqual({
        ...clientRequest,
        headers: {
          ...clientRequest.headers,
          'content-type': 'text/plain',
          'content-disposition': expect.any(String),
        },
        signal: expect.any(AbortSignal),
      })

      await peer.response(REQUEST_ID, baseResponse)
    })

    it('form data', async () => {
      const formData = new FormData()
      formData.append('hello', 'world')
      formData.append('file', new File(['hello'], 'hello.txt', { type: 'text/plain' }))

      const clientRequest = {
        ...baseRequest,
        body: formData,
      }

      const [id, request] = await peer.message(await encodeRequestMessage(REQUEST_ID, MessageType.REQUEST, clientRequest))

      expect(id).toBe(REQUEST_ID)
      expect(request).toEqual({
        ...clientRequest,
        headers: {
          ...clientRequest.headers,
          'content-type': expect.stringMatching(/^multipart\/form-data; boundary=/),
        },
        signal: expect.any(AbortSignal),
      })

      await peer.response(REQUEST_ID, baseResponse)
    })
  })

  describe('response', () => {
    it('iterator', async () => {
      await peer.message(await encodeRequestMessage(REQUEST_ID, MessageType.REQUEST, baseRequest))

      await peer.response(REQUEST_ID, {
        ...baseResponse,
        body: (async function* () {
          yield 'hello'
          yield withEventMeta({ hello2: true }, { id: 'id-1' })
          return withEventMeta({ hello3: true }, { retry: 2000 })
        })(),
      })

      expect(send).toHaveBeenCalledTimes(4)
      expect(await decodeResponseMessage(send.mock.calls[0]![0])).toEqual([REQUEST_ID, MessageType.RESPONSE, {
        ...baseResponse,
        headers: {
          ...baseResponse.headers,
          'content-type': 'text/event-stream',
        },
        body: undefined,
      }])
      expect(await decodeResponseMessage(send.mock.calls[1]![0]))
        .toEqual([REQUEST_ID, MessageType.EVENT_ITERATOR, { event: 'message', data: 'hello' }])
      expect(await decodeResponseMessage(send.mock.calls[2]![0]))
        .toEqual([REQUEST_ID, MessageType.EVENT_ITERATOR, { event: 'message', data: { hello2: true }, meta: { id: 'id-1' } }])
      expect(await decodeResponseMessage(send.mock.calls[3]![0]))
        .toEqual([REQUEST_ID, MessageType.EVENT_ITERATOR, { event: 'done', data: { hello3: true }, meta: { retry: 2000 } }])
    })

    it('iterator with abort signal while sending', async () => {
      await peer.message(await encodeRequestMessage(REQUEST_ID, MessageType.REQUEST, baseRequest))

      const yieldFn = vi.fn(v => v)
      let isFinallyCalled = false

      peer.response(REQUEST_ID, {
        ...baseResponse,
        body: (async function* () {
          try {
            yield yieldFn('hello')
            await new Promise(resolve => setTimeout(resolve, 100))
            yield yieldFn('hello2')
            yield yieldFn('hello3')
          }
          finally {
            isFinallyCalled = true
          }
        })(),
      })

      await new Promise(resolve => setTimeout(resolve, 0))

      expect(send).toHaveBeenCalledTimes(2)

      await peer.message(await encodeRequestMessage(REQUEST_ID, MessageType.ABORT_SIGNAL, undefined))

      await new Promise(resolve => setTimeout(resolve, 100))

      expect(send).toHaveBeenCalledTimes(2)

      expect(await decodeResponseMessage(send.mock.calls[0]![0])).toEqual([REQUEST_ID, MessageType.RESPONSE, {
        ...baseResponse,
        headers: {
          ...baseResponse.headers,
          'content-type': 'text/event-stream',
        },
        body: undefined,
      }])
      expect(await decodeResponseMessage(send.mock.calls[1]![0]))
        .toEqual([REQUEST_ID, MessageType.EVENT_ITERATOR, { event: 'message', data: 'hello' }])

      expect(yieldFn).toHaveBeenCalledTimes(2)
      expect(isFinallyCalled).toBe(true)
    })

    it('hibernation event iterator', async () => {
      await peer.message(await encodeRequestMessage(REQUEST_ID, MessageType.REQUEST, baseRequest))

      const callback = vi.fn()

      await peer.response(REQUEST_ID, {
        ...baseResponse,
        body: new HibernationEventIterator(callback),
      })

      expect(send).toHaveBeenCalledTimes(1)
      expect(await decodeResponseMessage(send.mock.calls[0]![0])).toEqual([REQUEST_ID, MessageType.RESPONSE, {
        ...baseResponse,
        headers: {
          ...baseResponse.headers,
          'content-type': 'text/event-stream',
        },
        body: undefined,
      }])
    })

    it('file', async () => {
      const file = new File(['hello'], 'hello.txt', { type: 'text/plain' })

      await peer.message(await encodeRequestMessage(REQUEST_ID, MessageType.REQUEST, baseRequest))

      await peer.response(REQUEST_ID, {
        ...baseResponse,
        body: file,
      })

      expect(send).toHaveBeenCalledTimes(1)
      expect(await decodeResponseMessage(send.mock.calls[0]![0])).toEqual([REQUEST_ID, MessageType.RESPONSE, {
        ...baseResponse,
        headers: {
          ...baseResponse.headers,
          'content-type': 'text/plain',
          'content-disposition': expect.any(String),
        },
        body: file,
      }])
    })

    it('form data', async () => {
      const formData = new FormData()
      formData.append('hello', 'world')
      formData.append('file', new File(['hello'], 'hello.txt', { type: 'text/plain' }))

      await peer.message(await encodeRequestMessage(REQUEST_ID, MessageType.REQUEST, baseRequest))

      await peer.response(REQUEST_ID, {
        ...baseResponse,
        body: formData,
      })

      expect(send).toHaveBeenCalledTimes(1)
      expect(await decodeResponseMessage(send.mock.calls[0]![0])).toEqual([REQUEST_ID, MessageType.RESPONSE, {
        ...baseResponse,
        headers: {
          ...baseResponse.headers,
          'content-type': expect.stringMatching(/^multipart\/form-data; boundary=/),
        },
        body: formData,
      }])
    })

    it('close & throw if can not send', async () => {
      send.mockImplementation(() => {
        throw new Error('send error')
      })

      const [, request] = await peer.message(await encodeRequestMessage(REQUEST_ID, MessageType.REQUEST, baseRequest))
      await expect(peer.response(REQUEST_ID, baseResponse)).rejects.toThrow('send error')

      expect(send).toHaveBeenCalledTimes(1)
      expect(request!.signal!.aborted).toBe(false)

      await peer.response(REQUEST_ID, baseResponse)

      expect(send).toHaveBeenCalledTimes(1)
      expect(request!.signal!.aborted).toBe(false)
    })

    it('throw but not close if cannot manually stop iterator', async () => {
      send.mockRejectedValueOnce(new Error('send error'))

      const [, request] = await peer.message(await encodeRequestMessage(REQUEST_ID, MessageType.REQUEST, {
        ...baseRequest,
        body: (async function* () {})(),
      }))

      await expect((request as any).body.return()).rejects.toThrow('send error')

      expect(send).toHaveBeenCalledTimes(1)
      expect(request!.signal!.aborted).toBe(false)

      await peer.response(REQUEST_ID, baseResponse)

      expect(send).toHaveBeenCalledTimes(2)
      expect(request!.signal!.aborted).toBe(false)
    })

    it('throw and close if cannot send iterator', async () => {
      let time = 0
      send.mockImplementation(() => {
        if (time++ === 1) {
          throw new Error('send error')
        }
      })

      const [, request] = await peer.message(await encodeRequestMessage(REQUEST_ID, MessageType.REQUEST, baseRequest))

      const yieldFn = vi.fn(v => v)
      let iteratorError
      let isFinallyCalled = false

      await expect(peer.response(REQUEST_ID, {
        ...baseResponse,
        body: (async function* () {
          try {
            yield yieldFn('hello')
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
        })(),
      })).rejects.toThrow('send error')

      expect(iteratorError).toBe(undefined)
      expect(yieldFn).toHaveBeenCalledTimes(1)
      expect(isFinallyCalled).toBe(true)

      expect(send).toHaveBeenCalledTimes(2)
      expect(request!.signal!.aborted).toBe(false)
    })
  })

  it('close all', async () => {
    const [, request] = await peer.message(await encodeRequestMessage(REQUEST_ID, MessageType.REQUEST, baseRequest))
    const [, request2] = await peer.message(await encodeRequestMessage(REQUEST_ID + 1, MessageType.REQUEST, baseRequest))

    peer.close()

    expect(request!.signal!.aborted).toBe(true)
    expect(request2!.signal!.aborted).toBe(true)

    await peer.response(REQUEST_ID, baseResponse)
    await peer.response(REQUEST_ID + 1, baseResponse)

    expect(send).toHaveBeenCalledTimes(0)
  })
})
