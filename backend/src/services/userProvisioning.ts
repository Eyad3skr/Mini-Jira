import * as teamsRepo from '../db/repositories/teams.js';
import * as usersRepo from '../db/repositories/users.js';
import type { UserProfile } from '../types.js';

const PICKABLE_TEAM_BLOCKLIST = new Set(['all']);

export function profileNeedsOnboarding(profile: UserProfile): boolean {
  if (profile.onboardingComplete === true) return false;
  // Legacy seeded users created before onboarding flag existed
  if (profile.teamId?.trim() && profile.name?.trim()) return false;
  return true;
}

/** Create or load a Cognito user's DynamoDB row (no team until onboarding). */
export async function ensureUserProfile(
  userId: string,
  hints: { email?: string; name?: string } = {}
): Promise<UserProfile> {
  const existing = await usersRepo.getUser(userId);
  if (existing) {
    // Repair rows written before empty GSI keys were stripped (DynamoDB rejects "")
    if (
      (existing.teamId !== undefined && !existing.teamId.trim()) ||
      (existing.name !== undefined && !existing.name.trim())
    ) {
      const { teamId: _t, name: _n, ...rest } = existing;
      const repaired: UserProfile = {
        ...rest,
        ...(existing.teamId?.trim() ? { teamId: existing.teamId } : {}),
        ...(existing.name?.trim() ? { name: existing.name } : {}),
      };
      return usersRepo.upsertUser(repaired);
    }
    return existing;
  }

  const email = hints.email?.trim() || `${userId}@users.local`;

  const profile: UserProfile = {
    userId,
    email,
    role: 'employee',
    onboardingComplete: false,
    createdAt: new Date().toISOString(),
  };

  return usersRepo.upsertUser(profile);
}

export async function completeUserOnboarding(
  userId: string,
  data: { name: string; teamId: string }
): Promise<UserProfile> {
  const name = data.name.trim();
  const teamId = data.teamId.trim();

  if (!name || name.length < 2) {
    throw new OnboardingValidationError('Name must be at least 2 characters');
  }
  if (!teamId || PICKABLE_TEAM_BLOCKLIST.has(teamId)) {
    throw new OnboardingValidationError('Choose a valid team');
  }

  const team = await teamsRepo.getTeam(teamId);
  if (!team) {
    throw new OnboardingValidationError('Team not found');
  }

  const existing = await usersRepo.getUser(userId);
  const email = existing?.email ?? `${userId}@users.local`;

  return usersRepo.upsertUser({
    userId,
    email,
    name,
    role: existing?.role ?? 'employee',
    teamId,
    onboardingComplete: true,
    createdAt: existing?.createdAt ?? new Date().toISOString(),
  });
}

export class OnboardingValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'OnboardingValidationError';
  }
}

export function toMeResponse(profile: UserProfile) {
  const needsOnboarding = profileNeedsOnboarding(profile);
  const teamName =
    profile.teamId === 'all'
      ? 'ALL_TEAMS'
      : profile.teamId
        ? profile.teamId.toUpperCase()
        : '';

  return {
    id: profile.userId,
    name: profile.name ?? '',
    email: profile.email,
    role: profile.role,
    teamId: profile.teamId ?? '',
    teamName,
    needsOnboarding,
  };
}
