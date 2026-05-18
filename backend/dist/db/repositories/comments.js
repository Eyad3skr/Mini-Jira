import { PutCommand, QueryCommand } from '@aws-sdk/lib-dynamodb';
import { config } from '../../config.js';
import { docClient } from '../client.js';
const TableName = config.tables.comments;
export async function listComments(taskId) {
    const result = await docClient.send(new QueryCommand({
        TableName,
        KeyConditionExpression: 'taskId = :taskId',
        ExpressionAttributeValues: { ':taskId': taskId },
        ScanIndexForward: true,
    }));
    return (result.Items ?? []);
}
export async function createComment(comment) {
    await docClient.send(new PutCommand({ TableName, Item: comment }));
    return comment;
}
export async function countComments(taskId) {
    const comments = await listComments(taskId);
    return comments.length;
}
