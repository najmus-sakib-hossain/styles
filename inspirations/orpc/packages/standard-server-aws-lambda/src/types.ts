// this is mainly copied from aws-lambda

export interface APIGatewayProxyEventHeaders {
  [name: string]: string | undefined
}

export interface APIGatewayProxyEventPathParameters {
  [name: string]: string | undefined
}

export interface APIGatewayProxyEventQueryStringParameters {
  [name: string]: string | undefined
}

export interface APIGatewayProxyEventStageVariables {
  [name: string]: string | undefined
}

export interface APIGatewayProxyEventV2 {
  version: string
  routeKey: string
  rawPath: string
  rawQueryString: string
  cookies?: string[]
  headers: APIGatewayProxyEventHeaders
  queryStringParameters?: APIGatewayProxyEventQueryStringParameters
  requestContext: {
    domainName: string
    http: {
      method: string
      path: string
      protocol: string
    }
  }
  body?: string
  pathParameters?: APIGatewayProxyEventPathParameters
  isBase64Encoded: boolean
  stageVariables?: APIGatewayProxyEventStageVariables
}
