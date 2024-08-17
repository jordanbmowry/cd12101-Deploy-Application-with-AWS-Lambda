import { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda'

export function handler(event: APIGatewayProxyEvent): APIGatewayProxyResult {
  const todoId = event.pathParameters.todoId
  const updatedTodo = JSON.parse(event.body)

  // TODO: Update a TODO item with the provided id using values in the "updatedTodo" object
  return undefined
}
