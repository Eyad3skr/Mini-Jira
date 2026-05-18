import LoginShell from './LoginShell';
import LoginDevPanel from './LoginDevPanel';
import type { User } from '../../lib/types';

interface LoginScreenProps {
  onLogin: (user: User) => void;
}

/** Cognito not configured — local dev login only */
export default function LoginScreenLocal({ onLogin }: LoginScreenProps) {
  return (
    <LoginShell busy={false}>
      <div className="text-center mb-2 text-sm text-muted-foreground">SIGN IN (LOCAL DEV)</div>
      <LoginDevPanel onLogin={onLogin} />
    </LoginShell>
  );
}
