import type { AuthContextProps } from 'react-oidc-context';
import { signOutRedirect, signUpRedirect } from './cognito';

/** Start OIDC authorization code flow with the user pool. */
export function signInRedirect(auth: AuthContextProps): Promise<void> | undefined {
  return auth.signinRedirect();
}

/** Open Cognito Hosted UI create-account page. */
export function signUp(): void {
  signUpRedirect();
}

/**
 * Clear local OIDC user and redirect to Cognito logout endpoint.
 * Matches AWS SPA sample: removeUser() + hosted UI logout URL.
 */
export async function signOut(auth: AuthContextProps): Promise<void> {
  await auth.removeUser();
  signOutRedirect();
}
