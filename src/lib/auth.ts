import {
  AuthenticationDetails,
  CognitoUser,
  CognitoUserPool,
} from 'amazon-cognito-identity-js';
import { apiFetch } from './api';
import type { User } from './types';

const TOKEN_KEY = 'mini-jira-token';
const USER_KEY = 'mini-jira-user';

function isRealCognitoValue(value: string | undefined): boolean {
  if (!value?.trim()) return false;
  const v = value.trim().toLowerCase();
  return !v.includes('your-') && !v.includes('xxx') && v !== 'changeme';
}

const cognitoConfigured =
  isRealCognitoValue(import.meta.env.VITE_COGNITO_USER_POOL_ID) &&
  isRealCognitoValue(import.meta.env.VITE_COGNITO_CLIENT_ID);

function getUserPool(): CognitoUserPool {
  return new CognitoUserPool({
    UserPoolId: import.meta.env.VITE_COGNITO_USER_POOL_ID,
    ClientId: import.meta.env.VITE_COGNITO_CLIENT_ID,
  });
}

/** Dev-only quick login (backend DEV_AUTH tokens). Not used when mock flag is off. */
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

export function isCognitoConfigured(): boolean {
  return cognitoConfigured;
}

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

export function loginWithCognito(email: string, password: string): Promise<string> {
  if (!cognitoConfigured) {
    return Promise.reject(
      new Error('Cognito is not configured. Set VITE_COGNITO_USER_POOL_ID and VITE_COGNITO_CLIENT_ID.')
    );
  }

  const userPool = getUserPool();
  const cognitoUser = new CognitoUser({ Username: email.trim(), Pool: userPool });
  const authDetails = new AuthenticationDetails({
    Username: email.trim(),
    Password: password,
  });

  return new Promise((resolve, reject) => {
    cognitoUser.authenticateUser(authDetails, {
      onSuccess: (session) => {
        const token = session.getAccessToken().getJwtToken();
        resolve(token);
      },
      onFailure: (err) => reject(err),
    });
  });
}

export async function loginWithDevProfile(userId: string): Promise<User> {
  const entry = DEV_USERS.find((d) => d.token === userId);
  if (!entry) throw new Error('Unknown user');
  setSession(entry.token, entry.user);
  return entry.user;
}

export async function fetchMe(): Promise<User> {
  const me = await apiFetch<{
    id: string;
    name: string;
    email: string;
    role: User['role'];
    teamId: string;
    teamName: string;
  }>('/api/me');
  const user: User = {
    id: me.id,
    name: me.name,
    email: me.email,
    role: me.role,
    teamId: me.teamId,
    teamName: me.teamName,
  };
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

export async function loginWithCredentials(email: string, password: string): Promise<User> {
  if (isCognitoConfigured()) {
    const token = await loginWithCognito(email, password);
    setSession(token, {
      id: '',
      name: '',
      email,
      role: 'employee',
      teamId: '',
      teamName: '',
    });
    return fetchMe();
  }
  return loginWithDevCredentials(email, password);
}
