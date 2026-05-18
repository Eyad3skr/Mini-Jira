import { config } from '../config.js';
import * as usersRepo from '../db/repositories/users.js';
/**
 * Ensure a DynamoDB profile exists for a Cognito user (JWT sub).
 * New users get employee role and DEFAULT_TEAM_ID so team-scoped queries work.
 */
export async function ensureUserProfile(userId, hints = {}) {
    const existing = await usersRepo.getUser(userId);
    if (existing?.teamId)
        return existing;
    if (existing && !existing.teamId) {
        return usersRepo.upsertUser({
            ...existing,
            teamId: config.defaultTeamId,
            email: existing.email || hints.email?.trim() || `${userId}@users.local`,
            name: existing.name || hints.name?.trim() || 'User',
        });
    }
    const email = hints.email?.trim() || `${userId}@users.local`;
    const name = hints.name?.trim() ||
        (email.includes('@') ? email.split('@')[0] : 'User').replace(/[._]/g, ' ');
    const profile = {
        userId,
        email,
        name: name.charAt(0).toUpperCase() + name.slice(1),
        role: 'employee',
        teamId: config.defaultTeamId,
        createdAt: new Date().toISOString(),
    };
    return usersRepo.upsertUser(profile);
}
