import type { AuthProviderProps } from 'react-oidc-context';

function isRealValue(value: string | undefined): boolean {
  if (!value?.trim()) return false;
  const v = value.trim().toLowerCase();
  return !v.includes('your-') && !v.includes('xxx') && v !== 'changeme';
}

/** Cognito OIDC authority, e.g. https://cognito-idp.eu-north-1.amazonaws.com/eu-north-1_XXX */
export function getCognitoAuthority(): string | undefined {
  const direct = import.meta.env.VITE_COGNITO_AUTHORITY?.trim();
  if (isRealValue(direct)) return direct;

  const poolId = import.meta.env.VITE_COGNITO_USER_POOL_ID?.trim();
  const region = import.meta.env.VITE_COGNITO_REGION?.trim() || 'us-east-1';
  if (isRealValue(poolId)) {
    return `https://cognito-idp.${region}.amazonaws.com/${poolId}`;
  }
  return undefined;
}

export function getCognitoClientId(): string | undefined {
  const id = import.meta.env.VITE_COGNITO_CLIENT_ID?.trim();
  return isRealValue(id) ? id : undefined;
}

export function isOidcConfigured(): boolean {
  return Boolean(getCognitoAuthority() && getCognitoClientId());
}

/** Must match an allowed callback URL in the Cognito app client exactly. */
export function getOidcRedirectUri(): string {
  const configured = import.meta.env.VITE_COGNITO_REDIRECT_URI?.trim();
  const uri = isRealValue(configured)
    ? configured
    : typeof window !== 'undefined'
      ? window.location.origin
      : '';
  return uri.replace(/\/$/, '');
}

/** Hosted UI domain, e.g. https://your-prefix.auth.eu-north-1.amazoncognito.com */
export function getCognitoDomain(): string | undefined {
  const domain = import.meta.env.VITE_COGNITO_DOMAIN?.trim();
  if (!isRealValue(domain)) return undefined;
  return domain.replace(/\/$/, '');
}

export function getOidcLogoutUri(): string {
  const configured = import.meta.env.VITE_COGNITO_LOGOUT_URI?.trim();
  if (isRealValue(configured)) return configured;
  return getOidcRedirectUri();
}

/**
 * Cognito hosted UI logout (clears IdP session).
 * @see https://docs.aws.amazon.com/cognito/latest/developerguide/logout-endpoint.html
 */
export function signOutRedirect(): void {
  const clientId = getCognitoClientId();
  const logoutUri = getOidcLogoutUri();
  const cognitoDomain = getCognitoDomain();
  if (!clientId || !logoutUri || !cognitoDomain) {
    console.warn('Cognito logout skipped: set VITE_COGNITO_DOMAIN and client/logout URIs');
    return;
  }
  window.location.href = `${cognitoDomain}/logout?client_id=${clientId}&logout_uri=${encodeURIComponent(logoutUri)}`;
}

/** Cognito Hosted UI sign-up (requires AllowAdminCreateUserOnly=false on the user pool). */
export function signUpRedirect(): void {
  const clientId = getCognitoClientId();
  const redirectUri = getOidcRedirectUri();
  const cognitoDomain = getCognitoDomain();
  const scope = encodeURIComponent(
    import.meta.env.VITE_COGNITO_SCOPE?.trim() || 'openid email profile'
  );
  if (!clientId || !redirectUri || !cognitoDomain) {
    console.warn('Cognito sign-up skipped: set VITE_COGNITO_DOMAIN, client id, and redirect URI');
    return;
  }
  window.location.href =
    `${cognitoDomain}/signup?client_id=${clientId}` +
    `&redirect_uri=${encodeURIComponent(redirectUri)}` +
    `&response_type=code&scope=${scope}`;
}

export function buildAuthProviderProps(): AuthProviderProps | null {
  const authority = getCognitoAuthority();
  const client_id = getCognitoClientId();
  if (!authority || !client_id) return null;

  const redirect_uri = getOidcRedirectUri();

  return {
    authority,
    client_id,
    redirect_uri,
    response_type: 'code',
    // profile is standard; phone scope often breaks if not enabled on the app client
    scope: import.meta.env.VITE_COGNITO_SCOPE?.trim() || 'openid email profile',
    automaticSilentRenew: import.meta.env.DEV !== true,
    onSigninCallback: () => {
      window.history.replaceState({}, document.title, window.location.pathname);
    },
  };
}

/** Log redirect URI in dev — must match Cognito “Allowed callback URLs” exactly. */
export function logOidcConfigInDev(): void {
  if (!import.meta.env.DEV || !isOidcConfigured()) return;
  const redirect = getOidcRedirectUri();
  console.info('[Cognito OIDC] redirect_uri:', redirect);
  console.info(
    '[Cognito OIDC] Add this exact URL under App client → Hosted UI → Allowed callback URLs'
  );
  const domain = getCognitoDomain();
  if (!domain) {
    console.warn(
      '[Cognito OIDC] Set VITE_COGNITO_DOMAIN (e.g. https://eu-north-1apjnlmnwh.auth.eu-north-1.amazoncognito.com) for sign-out'
    );
  }
}
