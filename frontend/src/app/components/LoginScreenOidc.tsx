import { useEffect, useRef } from 'react';
import { useAuth } from 'react-oidc-context';
import { toast } from 'sonner';
import type { User } from '../../lib/types';
import { signInRedirect, signOut, signUp } from '../../lib/cognitoAuth';
import LoginDevPanel from './LoginDevPanel';
import LoginShell from './LoginShell';

interface Props {
  onLogin: (user: User) => void;
}

const showDevPanel = import.meta.env.VITE_DEV_MOCK_LOGIN === 'true';

export default function LoginScreenOidc({ onLogin }: Props) {
  const auth = useAuth();
  const registerHandled = useRef(false);

  const busy = auth.isLoading || auth.activeNavigator === 'signinRedirect';

  // /register → open Cognito create-account page
  useEffect(() => {
    if (registerHandled.current) return;
    if (window.location.pathname.replace(/\/$/, '') === '/register') {
      registerHandled.current = true;
      signUp();
    }
  }, []);

  const handleSignIn = () => {
    try {
      void signInRedirect(auth);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Cognito sign-in failed');
    }
  };

  const handleSignUp = () => {
    try {
      signUp();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Cognito sign-up failed');
    }
  };

  const handleSignOut = async () => {
    try {
      await signOut(auth);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Sign-out failed');
    }
  };

  if (auth.error) {
    return (
      <LoginShell busy={false}>
        <div className="space-y-4 text-center">
          <p className="text-destructive text-sm">AUTH ERROR: {auth.error.message}</p>
          <button
            type="button"
            onClick={handleSignIn}
            className="w-full border-2 border-accent py-3 hover:bg-accent hover:text-accent-foreground transition-colors"
          >
            RETRY SIGN IN
          </button>
          <button
            type="button"
            onClick={() => void handleSignOut()}
            className="w-full border-2 border-primary/50 py-3 hover:bg-primary/10 transition-colors"
          >
            SIGN OUT
          </button>
        </div>
      </LoginShell>
    );
  }

  return (
    <LoginShell busy={busy}>
      <div className="space-y-4">
        <div className="text-center mb-2 text-sm text-muted-foreground">
          AWS COGNITO — PRODUCTION AUTH
        </div>
        <button
          type="button"
          onClick={handleSignIn}
          disabled={busy}
          className="w-full border-2 border-accent py-3 hover:bg-accent hover:text-accent-foreground transition-colors disabled:opacity-50"
        >
          {busy ? 'LOADING...' : 'SIGN IN WITH COGNITO'}
        </button>
        <button
          type="button"
          onClick={handleSignUp}
          disabled={busy}
          className="w-full border-2 border-primary py-3 hover:bg-primary/10 transition-colors disabled:opacity-50"
        >
          CREATE ACCOUNT
        </button>
        <p className="text-xs text-center text-muted-foreground">
          After Cognito sign-up and email verification, you will choose your name and team on first
          sign-in. Dev login below is for seeded DB users only.
        </p>
        {showDevPanel && <LoginDevPanel onLogin={onLogin} disabled={busy} />}
      </div>
    </LoginShell>
  );
}
