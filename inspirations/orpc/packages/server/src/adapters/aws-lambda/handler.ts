import type { MaybeOptionalOptions } from '@orpc/shared'
import type { APIGatewayProxyEventV2, ResponseStream, SendStandardResponseOptions } from '@orpc/standard-server-aws-lambda'
import type { Context } from '../../context'
import type { StandardHandler } from '../standard'
import type { FriendlyStandardHandleOptions } from '../standard/utils'
import { resolveMaybeOptionalOptions } from '@orpc/shared'
import { sendStandardResponse, toStandardLazyRequest } from '@orpc/standard-server-aws-lambda'
import { resolveFriendlyStandardHandleOptions } from '../standard/utils'

export interface AwsLambdaHandlerOptions extends SendStandardResponseOptions {

}

export type AwsLambdaHandleResult = { matched: true } | { matched: false }

export class AwsLambdaHandler<T extends Context> {
  private readonly sendStandardResponseOptions: SendStandardResponseOptions

  constructor(
    private readonly standardHandler: StandardHandler<T>,
    options: AwsLambdaHandlerOptions = {},
  ) {
    this.sendStandardResponseOptions = options
  }

  async handle(
    event: APIGatewayProxyEventV2,
    responseStream: ResponseStream,
    ...rest: MaybeOptionalOptions<FriendlyStandardHandleOptions<T>>
  ): Promise<AwsLambdaHandleResult> {
    const standardRequest = toStandardLazyRequest(event, responseStream)

    const options = resolveFriendlyStandardHandleOptions(resolveMaybeOptionalOptions(rest))
    const result = await this.standardHandler.handle(standardRequest, options)

    if (!result.matched) {
      return { matched: false }
    }

    await sendStandardResponse(responseStream, result.response, this.sendStandardResponseOptions)

    return { matched: true }
  }
}
