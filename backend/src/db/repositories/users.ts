import { GetCommand, PutCommand, QueryCommand } from '@aws-sdk/lib-dynamodb';
import { config } from '../../config.js';
import type { UserProfile } from '../../types.js';
import { docClient } from '../client.js';

const TableName = config.tables.users;

export async function getUser(userId: string): Promise<UserProfile | null> {
  const result = await docClient.send(new GetCommand({ TableName, Key: { userId } }));
  return (result.Item as UserProfile) ?? null;
}

export async function listUsersByTeam(teamId: string): Promise<UserProfile[]> {
  const result = await docClient.send(
    new QueryCommand({
      TableName,
      IndexName: 'TeamIndex',
      KeyConditionExpression: 'teamId = :teamId',
      ExpressionAttributeValues: { ':teamId': teamId },
    })
  );
  return (result.Items ?? []) as UserProfile[];
}

export async function listAllUsers(): Promise<UserProfile[]> {
  const { ScanCommand } = await import('@aws-sdk/lib-dynamodb');
  const result = await docClient.send(new ScanCommand({ TableName }));
  return (result.Items ?? []) as UserProfile[];
}

export async function getUserByEmail(email: string): Promise<UserProfile | null> {
  const users = await listAllUsers();
  const normalized = email.trim().toLowerCase();
  return users.find((u) => u.email.toLowerCase() === normalized) ?? null;
}

export async function upsertUser(user: UserProfile): Promise<UserProfile> {
  await docClient.send(new PutCommand({ TableName, Item: user }));
  return user;
}
