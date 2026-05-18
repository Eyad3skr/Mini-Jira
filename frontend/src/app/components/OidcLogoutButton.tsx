import { useAuth } from 'react-oidc-context';
import { clearSession } from '../../lib/auth';
import { signOutRedirect } from '../../lib/cognito';
import { signOut } from '../../lib/cognitoAuth';

interface OidcLogoutButtonProps {
  onLoggedOut: () => void;
}

export default function OidcLogoutButton({ onLoggedOut }: OidcLogoutButtonProps) {
  const auth = useAuth();

  const handleLogout = async () => {
    clearSession();
    onLoggedOut();
    try {
      await signOut(auth);
    } catch {
      signOutRedirect();
    }
  };

  return (
    <button
      type="button"
      onClick={() => void handleLogout()}
      className="px-4 py-1 border-2 border-destructive text-destructive hover:bg-destructive hover:text-destructive-foreground transition-colors"
    >
      SIGN OUT
    </button>
  );
}
