import { os } from '@orpc/server'
import { sendStandardResponse, toStandardLazyRequest } from '@orpc/standard-server-aws-lambda'
import { OpenAPIHandler } from './openapi-handler'

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

describe('openAPIHandler', async () => {
  const handlerOptions = { eventIteratorKeepAliveComment: '__test__' }

  const handler = new OpenAPIHandler({
    ping: os.route({ method: 'GET' }).handler(({ input }) => ({ output: input })),
  }, handlerOptions)

  const event: any = { req: true }
  const responseStream: any = { res: true }

  const standardRequest = {
    method: 'GET',
    url: new URL('https://example.com/api/v1/ping?key=value'),
    headers: {
      'content-type': 'application/json',
      'content-length': '12',
    },
    body: () => Promise.resolve('value'),
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
      body: { output: { key: 'value' } },
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
})
