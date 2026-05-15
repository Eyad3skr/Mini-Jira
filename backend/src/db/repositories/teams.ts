import { DeleteCommand, GetCommand, PutCommand, ScanCommand, UpdateCommand } from '@aws-sdk/lib-dynamodb';
import { config } from '../../config.js';
import type { Team } from '../../types.js';
import { docClient } from '../client.js';

const TableName = config.tables.teams;

export async function listTeams(): Promise<Team[]> {
  const result = await docClient.send(new ScanCommand({ TableName }));
  return (result.Items ?? []) as Team[];
}

export async function getTeam(teamId: string): Promise<Team | null> {
  const result = await docClient.send(new GetCommand({ TableName, Key: { teamId } }));
  return (result.Item as Team) ?? null;
}

export async function createTeam(team: Team): Promise<Team> {
  await docClient.send(new PutCommand({ TableName, Item: team }));
  return team;
}

export async function updateTeam(teamId: string, updates: Partial<Pick<Team, 'name'>>): Promise<Team | null> {
  const existing = await getTeam(teamId);
  if (!existing) return null;
  const updated = { ...existing, ...updates };
  await docClient.send(new PutCommand({ TableName, Item: updated }));
  return updated;
}

export async function deleteTeam(teamId: string): Promise<boolean> {
  const existing = await getTeam(teamId);
  if (!existing) return false;
  await docClient.send(new DeleteCommand({ TableName, Key: { teamId } }));
  return true;
}
