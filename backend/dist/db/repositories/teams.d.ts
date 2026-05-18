import type { Team } from '../../types.js';
export declare function listTeams(): Promise<Team[]>;
export declare function getTeam(teamId: string): Promise<Team | null>;
export declare function createTeam(team: Team): Promise<Team>;
export declare function updateTeam(teamId: string, updates: Partial<Pick<Team, 'name'>>): Promise<Team | null>;
export declare function deleteTeam(teamId: string): Promise<boolean>;
