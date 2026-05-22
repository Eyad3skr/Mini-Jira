/** teamId values that cannot be created or deleted as real teams */
export declare const RESERVED_TEAM_IDS: Set<string>;
export declare const TEAM_ID_PATTERN: RegExp;
export declare function normalizeTeamName(name: string): string;
export declare function validateTeamId(teamId: string): string | null;
export declare function validateTeamName(name: unknown): string | null;
