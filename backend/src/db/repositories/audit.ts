import { DeleteCommand, PutCommand, QueryCommand } from '@aws-sdk/lib-dynamodb';
import { config } from '../../config.js';
import type { TaskStatusAuditEntry } from '../../types.js';
import { docClient } from '../client.js';

const TableName = config.tables.taskStatusAudit;

export async function createAuditEntry(entry: TaskStatusAuditEntry): Promise<void> {
  await docClient.send(new PutCommand({ TableName, Item: entry }));
}

export async function listAuditForTask(taskId: string): Promise<TaskStatusAuditEntry[]> {
  const result = await docClient.send(
    new QueryCommand({
      TableName,
      KeyConditionExpression: 'taskId = :taskId',
      ExpressionAttributeValues: { ':taskId': taskId },
      ScanIndexForward: false,
    })
  );
  return (result.Items ?? []) as TaskStatusAuditEntry[];
}

export async function deleteAuditForTask(taskId: string): Promise<void> {
  const entries = await listAuditForTask(taskId);
  await Promise.all(
    entries.map((e) =>
      docClient.send(
        new DeleteCommand({
          TableName,
          Key: { taskId: e.taskId, auditKey: e.auditKey },
        })
      )
    )
  );
}
