import { DeleteCommand, GetCommand, PutCommand, QueryCommand, ScanCommand } from '@aws-sdk/lib-dynamodb';
import { config } from '../../config.js';
import type { Project } from '../../types.js';
import { docClient } from '../client.js';

const TableName = config.tables.projects;

export async function listProjects(teamId?: string): Promise<Project[]> {
  if (teamId) {
    const result = await docClient.send(
      new QueryCommand({
        TableName,
        IndexName: 'TeamIndex',
        KeyConditionExpression: 'teamId = :teamId',
        ExpressionAttributeValues: { ':teamId': teamId },
        ScanIndexForward: false,
      })
    );
    return (result.Items ?? []) as Project[];
  }
  const result = await docClient.send(new ScanCommand({ TableName }));
  return (result.Items ?? []) as Project[];
}

export async function getProject(projectId: string): Promise<Project | null> {
  const result = await docClient.send(new GetCommand({ TableName, Key: { projectId } }));
  return (result.Item as Project) ?? null;
}

export async function createProject(project: Project): Promise<Project> {
  await docClient.send(new PutCommand({ TableName, Item: project }));
  return project;
}

export async function updateProject(projectId: string, updates: Partial<Project>): Promise<Project | null> {
  const existing = await getProject(projectId);
  if (!existing) return null;
  const updated = { ...existing, ...updates, updatedAt: new Date().toISOString() };
  await docClient.send(new PutCommand({ TableName, Item: updated }));
  return updated;
}

export async function deleteProject(projectId: string): Promise<boolean> {
  const existing = await getProject(projectId);
  if (!existing) return false;
  await docClient.send(new DeleteCommand({ TableName, Key: { projectId } }));
  return true;
}
