import type { User } from 'oidc-client-ts';

/** Decode JWT payload without verifying (dev diagnostics only). */
export function decodeJwtPayload(token: string): Record<string, unknown> | null {
  try {
    const segment = token.split('.')[1];
    if (!segment) return null;
    const json = atob(segment.replace(/-/g, '+').replace(/_/g, '/'));
    return JSON.parse(json) as Record<string, unknown>;
  } catch {
    return null;
  }
}

/**
 * Cognito access token for API calls (backend expects token_use: "access").
 * Do not send the ID token — aws-jwt-verify rejects it with "Invalid token".
 */
export function getCognitoApiAccessToken(user: User | null | undefined): string | undefined {
  const access = user?.access_token;
  if (!access) return undefined;
  const payload = decodeJwtPayload(access);
  if (payload?.token_use === 'access') return access;
  return undefined;
}
