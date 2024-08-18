import Axios from 'axios'
// @ts-ignore
import jwkToPem from 'jwk-to-pem'
import jsonwebtoken, { JwtPayload, JwtHeader } from 'jsonwebtoken'
import { createLogger } from '../../utils/logger'
import {
  APIGatewayTokenAuthorizerEvent,
  APIGatewayAuthorizerResult
} from 'aws-lambda'

const logger = createLogger('auth')

const { AUTH_0_JWKS_URL = '' } = process.env

let jwksCache: {
  [kid: string]: { kid: string; n: string; e: string; alg: string }
} | null = null

export async function handler(
  event: APIGatewayTokenAuthorizerEvent
): Promise<APIGatewayAuthorizerResult> {
  try {
    const jwtToken = await verifyToken(event.authorizationToken)
    logger.info('auth0Authorizer handler succeeded')
    return createPolicy(jwtToken?.sub ?? 'user', true)
  } catch (e: any) {
    logger.error('User not authorized', { error: e.message })
    return createPolicy('user', false)
  }
}

const createPolicy = (
  principalId: string,
  allow: boolean
): APIGatewayAuthorizerResult => {
  logger.info('createPolicy generated')
  return {
    principalId,
    policyDocument: {
      Version: '2012-10-17',
      Statement: [
        {
          Action: 'execute-api:Invoke',
          Effect: allow ? 'Allow' : 'Deny',
          Resource: '*'
        }
      ]
    }
  }
}

async function verifyToken(
  authHeader: string
): Promise<JwtPayload | undefined> {
  const token = getToken(authHeader)
  const decodedJwt = decodeJwt(token)
  const kid = decodedJwt.header.kid

  if (!kid) {
    logger.error('Token header does not contain a kid')
    throw new Error('Token header does not contain a kid')
  }

  const signingKey = await getSigningKey(kid)
  const pem = jwkToPem(signingKey)
  logger.info('Token verified successfully')
  return jsonwebtoken.verify(token, pem) as JwtPayload
}

const getToken = (authHeader: string): string => {
  if (!authHeader) {
    throw new Error('No authentication header')
  }
  if (!authHeader.toLowerCase().startsWith('bearer ')) {
    logger.error('Invalid authentication header')
    throw new Error('Unauthorized')
  }
  logger.info('Token extracted successfully')
  return authHeader.split(' ')[1]
}

const decodeJwt = (token: string): JwtPayload & { header: JwtHeader } => {
  const decodedJwt = jsonwebtoken.decode(token, {
    complete: true
  }) as JwtPayload & { header: JwtHeader }
  if (!decodedJwt) {
    logger.error('Failed to decode token')
    throw new Error('Failed to decode token')
  }
  logger.info('Token decoded successfully')
  return decodedJwt
}

const getSigningKey = async (
  kid: string
): Promise<{ kid: string; n: string; e: string; alg: string }> => {
  if (jwksCache && jwksCache[kid]) {
    logger.info('Signing key retrieved from cache')
    return jwksCache[kid]
  }

  const {
    data: { keys }
  } = await Axios.get<{
    keys: Array<{ kid: string; n: string; e: string; alg: string }>
  }>(AUTH_0_JWKS_URL)

  jwksCache = keys.reduce((acc, key) => {
    acc[key.kid] = key
    return acc
  }, {} as { [kid: string]: { kid: string; n: string; e: string; alg: string } })

  const signingKey = jwksCache[kid]
  if (!signingKey) {
    logger.error('Invalid signing key')
    throw new Error('Invalid signing key')
  }

  logger.info('Signing key retrieved successfully')
  return signingKey
}
