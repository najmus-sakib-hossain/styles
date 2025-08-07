import type * as awslambda from 'aws-lambda'
import type { APIGatewayProxyEventV2 } from './types'

it('APIGatewayProxyEvent', () => {
  expectTypeOf<awslambda.APIGatewayProxyEventV2>().toExtend<APIGatewayProxyEventV2>()
})
