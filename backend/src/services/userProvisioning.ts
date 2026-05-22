import { RESERVED_TEAM_IDS } from '../constants/teams.js';
import * as teamsRepo from '../db/repositories/teams.js';
import * as usersRepo from '../db/repositories/users.js';
import type { UserProfile } from '../types.js';
import { getCognitoUserEmail } from './cognitoEmail.js';

function isPlaceholderEmail(email: string, userId: string): boolean {
  const e = email.trim().toLowerCase();
  return e.endsWith('@users.local') || e === `${userId.toLowerCase()}@users.local`;
}

function pickEmail(userId: string, ...candidates: (string | undefined)[]): string {
  for (const c of candidates) {
    const e = c?.trim();
    if (e && !isPlaceholderEmail(e, userId)) return e;
  }
  return `${userId}@users.local`;
}

async function resolveEmail(
  userId: string,
  hints: { email?: string } = {}
): Promise<string> {
  const hint = hints.email?.trim();
  if (hint && !isPlaceholderEmail(hint, userId)) return hint;
  const fromCognito = await getCognitoUserEmail(userId);
  if (fromCognito && !isPlaceholderEmail(fromCognito, userId)) return fromCognito;
  return pickEmail(userId, hints.email);
}

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
    const email = await resolveEmail(userId, {
      email: hints.email && !isPlaceholderEmail(hints.email, userId) ? hints.email : existing.email,
    });
    const needsEmailRepair = existing.email !== email;
    // Repair rows written before empty GSI keys were stripped (DynamoDB rejects "")
    if (
      needsEmailRepair ||
      (existing.teamId !== undefined && !existing.teamId.trim()) ||
      (existing.name !== undefined && !existing.name.trim())
    ) {
      const { teamId: _t, name: _n, ...rest } = existing;
      const repaired: UserProfile = {
        ...rest,
        email,
        ...(existing.teamId?.trim() ? { teamId: existing.teamId } : {}),
        ...(existing.name?.trim() ? { name: existing.name } : {}),
        ...(hints.name?.trim() ? { name: hints.name.trim() } : {}),
      };
      return usersRepo.upsertUser(repaired);
    }
    return existing;
  }

  const email = await resolveEmail(userId, hints);

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
  data: { name: string; teamId: string; email?: string }
): Promise<UserProfile> {
  const name = data.name.trim();
  const teamId = data.teamId.trim();

  if (!name || name.length < 2) {
    throw new OnboardingValidationError('Name must be at least 2 characters');
  }
  if (!teamId || RESERVED_TEAM_IDS.has(teamId)) {
    throw new OnboardingValidationError('Choose a valid team');
  }

  const team = await teamsRepo.getTeam(teamId);
  if (!team) {
    throw new OnboardingValidationError('Team not found');
  }

  const existing = await usersRepo.getUser(userId);
  const email = await resolveEmail(userId, { email: pickEmail(userId, data.email, existing?.email) });

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
