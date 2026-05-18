import { useState } from 'react';
import { toast } from 'sonner';
import type { User } from '../../lib/types';
import {
  DEV_USERS,
  fetchMe,
  loginWithDevCredentials,
  loginWithDevProfile,
} from '../../lib/auth';
import { ApiError } from '../../lib/api';

interface LoginDevPanelProps {
  onLogin: (user: User) => void;
  disabled?: boolean;
}

/** Seeded DynamoDB users — requires backend DEV_AUTH=true */
export default function LoginDevPanel({ onLogin, disabled }: LoginDevPanelProps) {
  const [loading, setLoading] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  const busy = loading || disabled;

  const handleCredentialLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim() || !password) {
      toast.error('Email and password are required');
      return;
    }
    setLoading(true);
    try {
      const user = await loginWithDevCredentials(email, password);
      onLogin(user);
    } catch (err) {
      if (err instanceof ApiError && (err.status === 404 || err.message === 'Not available')) {
        toast.error('Dev login is off on the API. Set DEV_AUTH=true in backend/.env and restart.');
      } else {
        toast.error(err instanceof Error ? err.message : 'Sign-in failed');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleDevLogin = async (userId: string) => {
    setLoading(true);
    try {
      await loginWithDevProfile(userId);
      const me = await fetchMe();
      onLogin(me);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Login failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="mt-6 border-t-2 border-primary/30 pt-6 space-y-4">
      <div className="text-center text-xs text-muted-foreground">
        LOCAL DEV — SEEDED DYNAMODB USERS (password: Demo123!)
      </div>
      <div className="border border-primary/30 p-3 text-xs text-muted-foreground space-y-1">
        <div>ali@company.com — manager</div>
        <div>sara@company.com — frontend</div>
        <div>omar@company.com — backend</div>
      </div>
      <form onSubmit={handleCredentialLogin} className="space-y-3">
        <input
          type="email"
          autoComplete="email"
          placeholder="EMAIL"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          disabled={busy}
          className="w-full border-2 border-primary/50 bg-background px-4 py-3 text-sm tracking-wide disabled:opacity-50"
        />
        <input
          type="password"
          autoComplete="current-password"
          placeholder="PASSWORD"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          disabled={busy}
          className="w-full border-2 border-primary/50 bg-background px-4 py-3 text-sm tracking-wide disabled:opacity-50"
        />
        <button
          type="submit"
          disabled={busy}
          className="w-full border-2 border-accent py-3 hover:bg-accent hover:text-accent-foreground transition-colors disabled:opacity-50"
        >
          {busy ? 'AUTHENTICATING...' : 'SIGN IN (DEV)'}
        </button>
      </form>
      <div className="space-y-2">
        {DEV_USERS.map(({ user }) => (
          <button
            key={user.id}
            type="button"
            disabled={busy}
            onClick={() => void handleDevLogin(user.id)}
            className="w-full border-2 border-primary/50 p-3 text-left text-sm hover:bg-primary/10 disabled:opacity-50"
          >
            {user.name} — {user.role.toUpperCase()} / {user.teamName}
          </button>
        ))}
      </div>
    </div>
  );
}
