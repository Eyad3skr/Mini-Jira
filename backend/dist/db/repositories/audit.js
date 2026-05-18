import { PutCommand, QueryCommand } from '@aws-sdk/lib-dynamodb';
import { config } from '../../config.js';
import { docClient } from '../client.js';
const TableName = config.tables.taskStatusAudit;
export async function createAuditEntry(entry) {
    await docClient.send(new PutCommand({ TableName, Item: entry }));
}
export async function listAuditForTask(taskId) {
    const result = await docClient.send(new QueryCommand({
        TableName,
        KeyConditionExpression: 'taskId = :taskId',
        ExpressionAttributeValues: { ':taskId': taskId },
        ScanIndexForward: false,
    }));
    return (result.Items ?? []);
}
