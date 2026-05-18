import { GetCommand, PutCommand, QueryCommand } from '@aws-sdk/lib-dynamodb';
import { config } from '../../config.js';
import { docClient } from '../client.js';
const TableName = config.tables.users;
export async function getUser(userId) {
    const result = await docClient.send(new GetCommand({ TableName, Key: { userId } }));
    return result.Item ?? null;
}
export async function listUsersByTeam(teamId) {
    const result = await docClient.send(new QueryCommand({
        TableName,
        IndexName: 'TeamIndex',
        KeyConditionExpression: 'teamId = :teamId',
        ExpressionAttributeValues: { ':teamId': teamId },
    }));
    return (result.Items ?? []);
}
export async function listAllUsers() {
    const { ScanCommand } = await import('@aws-sdk/lib-dynamodb');
    const result = await docClient.send(new ScanCommand({ TableName }));
    return (result.Items ?? []);
}
export async function getUserByEmail(email) {
    const users = await listAllUsers();
    const normalized = email.trim().toLowerCase();
    return users.find((u) => u.email.toLowerCase() === normalized) ?? null;
}
export async function upsertUser(user) {
    await docClient.send(new PutCommand({ TableName, Item: user }));
    return user;
}
