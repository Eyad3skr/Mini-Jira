import { apiFetch } from './api';
import type { Team } from './types';

/** Teams from DynamoDB (excludes synthetic `all` manager scope). */
export async function fetchPickableTeams(): Promise<Team[]> {
  const list = await apiFetch<Team[]>('/api/teams');
  return list.filter((t) => t.teamId !== 'all');
}
