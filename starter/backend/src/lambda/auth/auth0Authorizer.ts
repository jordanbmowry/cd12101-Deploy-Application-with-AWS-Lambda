import Axios from 'axios'
import jsonwebtoken, { JwtPayload } from 'jsonwebtoken'
import { createLogger } from '../../utils/logger'
import {
  APIGatewayTokenAuthorizerEvent,
  APIGatewayAuthorizerResult
} from 'aws-lambda'

const logger = createLogger('auth')

const jwksUrl = 'https://test-endpoint.auth0.com/.well-known/jwks.json'

export async function handler(
  event: APIGatewayTokenAuthorizerEvent
): Promise<APIGatewayAuthorizerResult> {
  try {
    const jwtToken = await verifyToken(event.authorizationToken)

    if (!jwtToken) {
      throw new Error('Token verification failed')
    }

    return {
      principalId: jwtToken.sub as string,
      policyDocument: {
        Version: '2012-10-17',
        Statement: [
          {
            Action: 'execute-api:Invoke',
            Effect: 'Allow',
            Resource: '*'
          }
        ]
      }
    }
  } catch (e: any) {
    logger.error('User not authorized', { error: e.message })

    return {
      principalId: 'user',
      policyDocument: {
        Version: '2012-10-17',
        Statement: [
          {
            Action: 'execute-api:Invoke',
            Effect: 'Deny',
            Resource: '*'
          }
        ]
      }
    }
  }
}

async function verifyToken(
  authHeader: string
): Promise<JwtPayload | undefined> {
  const token = getToken(authHeader)
  const jwt = jsonwebtoken.decode(token, {
    complete: true
  }) as JwtPayload | null

  if (!jwt) {
    throw new Error('Failed to decode token')
  }

  // TODO: Implement token verification using jwksUrl
  return jwt
}

function getToken(authHeader: string): string {
  if (!authHeader) throw new Error('No authentication header')

  if (!authHeader.toLowerCase().startsWith('bearer '))
    throw new Error('Invalid authentication header')

  const split = authHeader.split(' ')
  const token = split[1]

  return token
}
