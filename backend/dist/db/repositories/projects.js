import { DeleteCommand, GetCommand, PutCommand, QueryCommand, ScanCommand } from '@aws-sdk/lib-dynamodb';
import { config } from '../../config.js';
import { docClient } from '../client.js';
const TableName = config.tables.projects;
export async function listProjects(teamId) {
    if (teamId) {
        const result = await docClient.send(new QueryCommand({
            TableName,
            IndexName: 'TeamIndex',
            KeyConditionExpression: 'teamId = :teamId',
            ExpressionAttributeValues: { ':teamId': teamId },
            ScanIndexForward: false,
        }));
        return (result.Items ?? []);
    }
    const result = await docClient.send(new ScanCommand({ TableName }));
    return (result.Items ?? []);
}
export async function getProject(projectId) {
    const result = await docClient.send(new GetCommand({ TableName, Key: { projectId } }));
    return result.Item ?? null;
}
export async function createProject(project) {
    await docClient.send(new PutCommand({ TableName, Item: project }));
    return project;
}
export async function updateProject(projectId, updates) {
    const existing = await getProject(projectId);
    if (!existing)
        return null;
    const updated = { ...existing, ...updates, updatedAt: new Date().toISOString() };
    await docClient.send(new PutCommand({ TableName, Item: updated }));
    return updated;
}
export async function deleteProject(projectId) {
    const existing = await getProject(projectId);
    if (!existing)
        return false;
    await docClient.send(new DeleteCommand({ TableName, Key: { projectId } }));
    return true;
}
