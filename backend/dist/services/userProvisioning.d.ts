import type { UserProfile } from '../types.js';
/**
 * Ensure a DynamoDB profile exists for a Cognito user (JWT sub).
 * New users get employee role and DEFAULT_TEAM_ID so team-scoped queries work.
 */
export declare function ensureUserProfile(userId: string, hints?: {
    email?: string;
    name?: string;
}): Promise<UserProfile>;
