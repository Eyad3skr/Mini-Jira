import { useEffect, useRef } from 'react';
import { useAuth } from 'react-oidc-context';
import { toast } from 'sonner';
import { clearSession, fetchMe, isOidcConfigured, setSession } from '../lib/auth';
import { decodeJwtPayload, getCognitoApiAccessToken } from '../lib/cognitoToken';
import type { User } from '../lib/types';

interface OidcAuthBridgeProps {
  onAuthenticated: (user: User) => void;
}

/** After Cognito redirect, sync access token to API session and load /api/me. */
export default function OidcAuthBridge({ onAuthenticated }: OidcAuthBridgeProps) {
  const auth = useAuth();
  const syncedRef = useRef(false);

  useEffect(() => {
    if (!isOidcConfigured()) return;

    if (auth.isAuthenticated && auth.user && !syncedRef.current) {
      const token = getCognitoApiAccessToken(auth.user);
      if (!token) {
        const idPayload = auth.user.id_token
          ? decodeJwtPayload(auth.user.id_token)
          : null;
        if (idPayload?.token_use === 'id' && !auth.user.access_token) {
          toast.error(
            'Cognito did not return an access token. Check app client OAuth scopes (openid, email, profile).'
          );
        } else if (auth.user.access_token) {
          toast.error('Wrong token type for API — expected Cognito access token, not ID token.');
        }
        return;
      }
      syncedRef.current = true;
      setSession(token, {
        id: '',
        name: '',
        email: auth.user.profile.email?.toString() ?? '',
        role: 'employee',
        teamId: '',
        teamName: '',
      });
      fetchMe()
        .then(onAuthenticated)
        .catch((err) => {
          syncedRef.current = false;
          clearSession();
          toast.error(err instanceof Error ? err.message : 'Failed to load profile');
        });
    }

    if (!auth.isAuthenticated) {
      syncedRef.current = false;
    }
  }, [auth.isAuthenticated, auth.user, onAuthenticated]);

  return null;
}
