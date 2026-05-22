import { DeleteCommand, GetCommand, PutCommand, QueryCommand } from '@aws-sdk/lib-dynamodb';
import { config } from '../../config.js';
import type { Task } from '../../types.js';
import { docClient } from '../client.js';

const TableName = config.tables.tasks;

export async function listTasksByTeam(teamId: string): Promise<Task[]> {
  const result = await docClient.send(
    new QueryCommand({
      TableName,
      IndexName: 'TeamIndex',
      KeyConditionExpression: 'teamId = :teamId',
      ExpressionAttributeValues: { ':teamId': teamId },
      ScanIndexForward: false,
    })
  );
  return (result.Items ?? []) as Task[];
}

export async function listTasksByAssignee(assigneeId: string): Promise<Task[]> {
  const result = await docClient.send(
    new QueryCommand({
      TableName,
      IndexName: 'AssigneeIndex',
      KeyConditionExpression: 'assigneeId = :assigneeId',
      ExpressionAttributeValues: { ':assigneeId': assigneeId },
    })
  );
  return (result.Items ?? []) as Task[];
}

export async function listAllTasks(): Promise<Task[]> {
  const { ScanCommand } = await import('@aws-sdk/lib-dynamodb');
  const result = await docClient.send(new ScanCommand({ TableName }));
  return (result.Items ?? []) as Task[];
}

export async function getTask(taskId: string): Promise<Task | null> {
  const result = await docClient.send(new GetCommand({ TableName, Key: { taskId } }));
  return (result.Item as Task) ?? null;
}

export async function createTask(task: Task): Promise<Task> {
  await docClient.send(new PutCommand({ TableName, Item: task }));
  return task;
}

export async function updateTask(taskId: string, updates: Partial<Task>): Promise<Task | null> {
  const existing = await getTask(taskId);
  if (!existing) return null;
  const updated = { ...existing, ...updates, updatedAt: new Date().toISOString() };
  await docClient.send(new PutCommand({ TableName, Item: updated }));
  return updated;
}

export async function deleteTask(taskId: string): Promise<boolean> {
  const existing = await getTask(taskId);
  if (!existing) return false;
  await docClient.send(new DeleteCommand({ TableName, Key: { taskId } }));
  return true;
}

export async function syncTeamNameForTeam(teamId: string, teamName: string): Promise<void> {
  const tasks = await listTasksByTeam(teamId);
  await Promise.all(
    tasks.map((t) => updateTask(t.taskId, { teamName }))
  );
}
