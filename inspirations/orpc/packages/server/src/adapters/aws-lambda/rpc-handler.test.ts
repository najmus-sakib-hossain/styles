import { sendStandardResponse, toStandardLazyRequest } from '@orpc/standard-server-aws-lambda'
import { os } from '../../builder'
import { RPCHandler } from './rpc-handler'

vi.mock('@orpc/standard-server-aws-lambda', () => ({
  toStandardLazyRequest: vi.fn(),
  sendStandardResponse: vi.fn(),
}))

vi.mock('../standard', async origin => ({
  ...await origin(),
  StandardHandler: vi.fn(),
}))

beforeEach(() => {
  vi.clearAllMocks()
})

describe('rpcHandler', async () => {
  const handlerOptions = { eventIteratorKeepAliveComment: '__test__' }

  const handler = new RPCHandler({
    ping: os.route({ method: 'GET' }).handler(({ input }) => ({ output: input })),
    pong: os.handler(({ input }) => ({ output: input })),
  }, handlerOptions)

  const event: any = { req: true }
  const responseStream: any = { res: true }

  const standardRequest = {
    method: 'POST',
    url: new URL('https://example.com/api/v1/ping'),
    headers: {
      'content-type': 'application/json',
      'content-length': '12',
    },
    body: () => Promise.resolve({ json: 'value' }),
    signal: undefined,
  }

  it('on match', async () => {
    vi.mocked(toStandardLazyRequest).mockReturnValueOnce(standardRequest)
    const options = { prefix: '/api/v1', context: { db: 'postgres' } } as const

    const result = await handler.handle(event, responseStream, options)

    expect(result).toEqual({
      matched: true,
    })

    expect(toStandardLazyRequest).toHaveBeenCalledOnce()
    expect(toStandardLazyRequest).toHaveBeenCalledWith(event, responseStream)

    expect(sendStandardResponse).toHaveBeenCalledOnce()
    expect(sendStandardResponse).toHaveBeenCalledWith(responseStream, {
      status: 200,
      headers: {},
      body: {
        json: { output: 'value' },
      },
    }, handlerOptions)
  })

  it('on mismatch', async () => {
    vi.mocked(toStandardLazyRequest).mockReturnValueOnce({
      ...standardRequest,
      url: new URL('https://example.com/api/v1/not-found'),
    })

    const options = { prefix: '/api/v1', context: { db: 'postgres' } } as const
    const result = await handler.handle(event, responseStream, options)

    expect(result).toEqual({
      matched: false,
      response: undefined,
    })

    expect(toStandardLazyRequest).toHaveBeenCalledOnce()
    expect(toStandardLazyRequest).toHaveBeenCalledWith(event, responseStream)

    expect(sendStandardResponse).not.toHaveBeenCalled()
  })

  it('strict GET method by default', async () => {
    vi.mocked(toStandardLazyRequest).mockReturnValueOnce({
      ...standardRequest,
      url: new URL('https://example.com/api/v1/pong?data=%7B%22json%22%3A%22value%22%7D'),
      method: 'GET',
    })

    const options = { prefix: '/api/v1', context: { db: 'postgres' } } as const
    const result = await handler.handle(event, responseStream, options)

    expect(result).toEqual({
      matched: true,
    })

    expect(toStandardLazyRequest).toHaveBeenCalledOnce()
    expect(toStandardLazyRequest).toHaveBeenCalledWith(event, responseStream)

    expect(sendStandardResponse).toHaveBeenCalledOnce()
    expect(sendStandardResponse).toHaveBeenCalledWith(responseStream, {
      status: 405,
      headers: {},
      body: {
        json: expect.objectContaining({
          message: 'Method Not Supported',
        }),
      },
    }, handlerOptions)
  })
})
