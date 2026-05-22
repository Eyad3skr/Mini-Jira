import { apiFetch } from './api';
import type { Team } from './types';

export interface TeamDeletePreview {
  teamId: string;
  name: string;
  users: number;
  projects: number;
  tasks: number;
}

/** Teams from DynamoDB (excludes synthetic `all` manager scope). */
export async function fetchPickableTeams(): Promise<Team[]> {
  const list = await apiFetch<Team[]>('/api/teams');
  return list.filter((t) => t.teamId !== 'all');
}

export async function fetchTeamDeletePreview(teamId: string): Promise<TeamDeletePreview> {
  return apiFetch<TeamDeletePreview>(
    `/api/teams/${encodeURIComponent(teamId)}/delete-preview`
  );
}

export async function updateTeam(teamId: string, name: string): Promise<Team> {
  return apiFetch<Team>(`/api/teams/${encodeURIComponent(teamId)}`, {
    method: 'PATCH',
    body: JSON.stringify({ name }),
  });
}

export async function deleteTeam(teamId: string): Promise<void> {
  await apiFetch(`/api/teams/${encodeURIComponent(teamId)}`, { method: 'DELETE' });
}
