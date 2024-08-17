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

const jwksUrl = `https://dev-51f5lkluu0kyub2y.us.auth0.com/.well-known/jwks.json`

export async function handler(
  event: APIGatewayTokenAuthorizerEvent
): Promise<APIGatewayAuthorizerResult> {
  try {
    const jwtToken = await verifyToken(event.authorizationToken)

    return createPolicy(jwtToken?.sub ?? 'user', true)
  } catch (e: any) {
    logger.error('User not authorized', { error: e.message })
    return createPolicy('user', false)
  }
}

const createPolicy = (
  principalId: string,
  allow: boolean
): APIGatewayAuthorizerResult => ({
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
})

async function verifyToken(
  authHeader: string
): Promise<JwtPayload | undefined> {
  const token = getToken(authHeader)
  const decodedJwt = decodeJwt(token)
  const kid = decodedJwt.header.kid

  if (!kid) {
    throw new Error('Token header does not contain a kid')
  }

  const signingKey = await getSigningKey(kid)
  const pem = jwkToPem(signingKey)

  return jsonwebtoken.verify(token, pem) as JwtPayload
}

const getToken = (authHeader: string): string => {
  if (!authHeader) {
    throw new Error('No authentication header')
  }
  if (!authHeader.toLowerCase().startsWith('bearer ')) {
    throw new Error('Invalid authentication header')
  }

  return authHeader.split(' ')[1]
}

const decodeJwt = (token: string): JwtPayload & { header: JwtHeader } => {
  const decodedJwt = jsonwebtoken.decode(token, {
    complete: true
  }) as JwtPayload & { header: JwtHeader }
  if (!decodedJwt) throw new Error('Failed to decode token')
  return decodedJwt
}

const getSigningKey = async (
  kid: string
): Promise<{ kid: string; n: string; e: string; alg: string }> => {
  const {
    data: { keys }
  } = await Axios.get<{
    keys: Array<{ kid: string; n: string; e: string; alg: string }>
  }>(jwksUrl)

  const signingKey = keys.find((key) => key.kid === kid)
  if (!signingKey) throw new Error('Invalid signing key')

  return signingKey
}
