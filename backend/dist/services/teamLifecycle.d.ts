export interface TeamDeletePreview {
    teamId: string;
    name: string;
    users: number;
    projects: number;
    tasks: number;
}
export declare class TeamLifecycleError extends Error {
    readonly code: 'NOT_FOUND' | 'FORBIDDEN' | 'VALIDATION';
    constructor(message: string, code: 'NOT_FOUND' | 'FORBIDDEN' | 'VALIDATION');
}
export declare function getTeamDeletePreview(teamId: string): Promise<TeamDeletePreview>;
export declare function deleteTeamAndDependencies(teamId: string): Promise<void>;
export declare function syncTeamDisplayName(teamId: string, teamName: string): Promise<void>;
