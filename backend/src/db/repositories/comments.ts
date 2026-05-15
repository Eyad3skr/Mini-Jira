import { PutCommand, QueryCommand } from '@aws-sdk/lib-dynamodb';
import { config } from '../../config.js';
import type { Comment } from '../../types.js';
import { docClient } from '../client.js';

const TableName = config.tables.comments;

export async function listComments(taskId: string): Promise<Comment[]> {
  const result = await docClient.send(
    new QueryCommand({
      TableName,
      KeyConditionExpression: 'taskId = :taskId',
      ExpressionAttributeValues: { ':taskId': taskId },
      ScanIndexForward: true,
    })
  );
  return (result.Items ?? []) as Comment[];
}

export async function createComment(comment: Comment): Promise<Comment> {
  await docClient.send(new PutCommand({ TableName, Item: comment }));
  return comment;
}

export async function countComments(taskId: string): Promise<number> {
  const comments = await listComments(taskId);
  return comments.length;
}
