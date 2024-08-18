import middy from '@middy/core'
import cors from '@middy/http-cors'
import httpErrorHandler from '@middy/http-error-handler'
import { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda'
import { DynamoDB } from '@aws-sdk/client-dynamodb'
import {
  DynamoDBDocument,
  DeleteCommand,
  DeleteCommandInput
} from '@aws-sdk/lib-dynamodb'
import { createLogger } from '../../utils/logger'
import AWSXRay from 'aws-xray-sdk-core'

const logger = createLogger('deleteTodo')

const dynamoDbClient = AWSXRay.captureAWSv3Client(new DynamoDB() as any)
const dynamoDb = DynamoDBDocument.from(dynamoDbClient)

const { TODOS_TABLE = '' } = process.env

async function deleteTodo(todoId: string, userId: string): Promise<void> {
  const params: DeleteCommandInput = {
    TableName: TODOS_TABLE,
    Key: { todoId, userId }
  }

  await dynamoDb.send(new DeleteCommand(params))
  logger.info('TODO item deleted from DynamoDB', { userId, todoId })
}

async function mainHandler(
  event: APIGatewayProxyEvent
): Promise<APIGatewayProxyResult> {
  const todoId = event.pathParameters?.todoId

  if (!todoId) {
    logger.error('Invalid request: No todoId provided')
    return {
      statusCode: 400,
      body: JSON.stringify({
        message: 'Invalid request: No todoId provided'
      })
    }
  }

  const userId = event.requestContext.authorizer?.principalId
  if (!userId) {
    logger.error('Invalid request: No userId found')
    return {
      statusCode: 400,
      body: JSON.stringify({
        message: 'Invalid request: No userId found'
      })
    }
  }

  try {
    await deleteTodo(todoId, userId)
    logger.info('TODO item deleted successfully', { userId, todoId })
    return {
      statusCode: 204,
      body: ''
    }
  } catch (error) {
    logger.error('Failed to delete TODO item', { error, userId, todoId })
    return {
      statusCode: 500,
      body: JSON.stringify({
        message: 'Failed to delete TODO item'
      })
    }
  }
}

export const handler = middy(mainHandler)
  .use(httpErrorHandler())
  .use(
    cors({
      credentials: true
    })
  )
