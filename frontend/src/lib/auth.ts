import { apiFetch } from './api';
import { getCognitoClientId, getCognitoAuthority, isOidcConfigured } from './cognito';
import type { User } from './types';

const TOKEN_KEY = 'mini-jira-token';
const USER_KEY = 'mini-jira-user';

export { isOidcConfigured, getCognitoAuthority, getCognitoClientId };

/** @deprecated Use isOidcConfigured — kept for existing imports */
export function isCognitoConfigured(): boolean {
  return isOidcConfigured();
}

/** Dev-only quick login (backend DEV_AUTH tokens). */
export const DEV_USERS: { token: string; user: User }[] = [
  {
    token: 'user-ali',
    user: {
      id: 'user-ali',
      name: 'Ali Hassan',
      email: 'ali@company.com',
      role: 'manager',
      teamId: 'all',
      teamName: 'ALL_TEAMS',
    },
  },
  {
    token: 'user-sara',
    user: {
      id: 'user-sara',
      name: 'Sara Ahmed',
      email: 'sara@company.com',
      role: 'employee',
      teamId: 'frontend',
      teamName: 'FRONTEND',
    },
  },
  {
    token: 'user-omar',
    user: {
      id: 'user-omar',
      name: 'Omar Khaled',
      email: 'omar@company.com',
      role: 'employee',
      teamId: 'backend',
      teamName: 'BACKEND',
    },
  },
];

export function getToken(): string | null {
  return localStorage.getItem(TOKEN_KEY);
}

export function setSession(token: string, user: User) {
  localStorage.setItem(TOKEN_KEY, token);
  localStorage.setItem(USER_KEY, JSON.stringify(user));
}

export function getStoredUser(): User | null {
  const raw = localStorage.getItem(USER_KEY);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as User;
  } catch {
    return null;
  }
}

export function clearSession() {
  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(USER_KEY);
}

export async function loginWithDevProfile(userId: string): Promise<User> {
  const entry = DEV_USERS.find((d) => d.token === userId);
  if (!entry) throw new Error('Unknown user');
  setSession(entry.token, entry.user);
  return entry.user;
}

function meToUser(me: {
  id: string;
  name: string;
  email: string;
  role: User['role'];
  teamId: string;
  teamName: string;
  needsOnboarding?: boolean;
}): User {
  return {
    id: me.id,
    name: me.name,
    email: me.email,
    role: me.role,
    teamId: me.teamId,
    teamName: me.teamName,
    needsOnboarding: me.needsOnboarding,
  };
}

export async function fetchMe(): Promise<User> {
  const me = await apiFetch<Parameters<typeof meToUser>[0]>('/api/me');
  const user = meToUser(me);
  const token = getToken();
  if (token) setSession(token, user);
  return user;
}

export async function completeOnboarding(name: string, teamId: string): Promise<User> {
  const me = await apiFetch<Parameters<typeof meToUser>[0]>('/api/me/onboarding', {
    method: 'PUT',
    body: JSON.stringify({ name: name.trim(), teamId }),
  });
  const user = meToUser(me);
  const token = getToken();
  if (token) setSession(token, user);
  return user;
}

export async function loginWithDevCredentials(
  email: string,
  password: string
): Promise<User> {
  const result = await apiFetch<{
    token: string;
    user: User;
  }>('/api/auth/login', {
    method: 'POST',
    body: JSON.stringify({ email: email.trim(), password }),
  });
  setSession(result.token, result.user);
  return result.user;
}
