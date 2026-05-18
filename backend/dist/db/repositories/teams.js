import { DeleteCommand, GetCommand, PutCommand, ScanCommand } from '@aws-sdk/lib-dynamodb';
import { config } from '../../config.js';
import { docClient } from '../client.js';
const TableName = config.tables.teams;
export async function listTeams() {
    const result = await docClient.send(new ScanCommand({ TableName }));
    return (result.Items ?? []);
}
export async function getTeam(teamId) {
    const result = await docClient.send(new GetCommand({ TableName, Key: { teamId } }));
    return result.Item ?? null;
}
export async function createTeam(team) {
    await docClient.send(new PutCommand({ TableName, Item: team }));
    return team;
}
export async function updateTeam(teamId, updates) {
    const existing = await getTeam(teamId);
    if (!existing)
        return null;
    const updated = { ...existing, ...updates };
    await docClient.send(new PutCommand({ TableName, Item: updated }));
    return updated;
}
export async function deleteTeam(teamId) {
    const existing = await getTeam(teamId);
    if (!existing)
        return false;
    await docClient.send(new DeleteCommand({ TableName, Key: { teamId } }));
    return true;
}
