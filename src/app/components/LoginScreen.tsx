import { useState } from 'react';
import { toast } from 'sonner';
import type { User } from '../../lib/types';
import {
  DEV_USERS,
  fetchMe,
  isCognitoConfigured,
  loginWithCredentials,
  loginWithDevProfile,
} from '../../lib/auth';

interface LoginScreenProps {
  onLogin: (user: User) => void;
}

const showDevProfiles = import.meta.env.VITE_DEV_MOCK_LOGIN === 'true';

export default function LoginScreen({ onLogin }: LoginScreenProps) {
  const [loading, setLoading] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  const handleCredentialLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim() || !password) {
      toast.error('Email and password are required');
      return;
    }
    setLoading(true);
    try {
      const user = await loginWithCredentials(email, password);
      onLogin(user);
    } catch (err) {
      const message =
        err instanceof Error ? err.message : 'Sign-in failed. Check your credentials.';
      toast.error(message);
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
<div className="size-full bg-background text-foreground flex items-center justify-center relative overflow-hidden">
<div className="pointer-events-none fixed inset-0 z-50 opacity-10">
<div className="h-full w-full" style={{ backgroundImage: 'repeating-linear-gradient(0deg, transparent, transparent 2px, #00ff88 2px, #00ff88 4px)' }} />
</div>
<div className="absolute inset-0 opacity-5">
<div className="h-full w-full" style={{ backgroundImage: 'linear-gradient(#00ff88 1px, transparent 1px), linear-gradient(90deg, #00ff88 1px, transparent 1px)', backgroundSize: '40px 40px' }} />
</div>
<div className="relative z-10 w-full max-w-2xl p-8">
<div className="border-4 border-primary p-8 bg-background/90">
<div className="text-center mb-8">
<div className="flex items-center justify-center gap-3 mb-4">
<div className="w-4 h-4 bg-primary animate-pulse" />
<h1 className="text-4xl tracking-widest">MINI-JIRA</h1>
<div className="w-4 h-4 bg-primary animate-pulse" />
</div>
<div className="text-sm text-muted-foreground">TASK MANAGEMENT SYSTEM v2.0</div>
<div className="text-xs text-muted-foreground mt-1">AWS CLOUD COMPUTING 2026</div>
</div>
<div className="border-2 border-primary/30 p-4 mb-6 bg-card">
<div className="text-xs space-y-1 text-muted-foreground">
<div>└── AUTHENTICATION: AWS COGNITO</div>
<div>└── DATABASE: DYNAMODB</div>
<div>└── STORAGE: S3 + LAMBDA</div>
<div>└── NOTIFICATIONS: SNS + SQS</div>
<div>└── STATUS: <span className="text-primary">ONLINE</span></div>
</div>
</div>
{loading ? (
<div className="text-center py-12">
<div className="text-2xl mb-4">AUTHENTICATING...</div>
<div className="flex justify-center gap-2">
{[...Array(5)].map((_, i) => (
<div key={i} className="w-3 h-3 bg-primary animate-pulse" style={{ animationDelay: String(i * 0.2) + 's' }} />
))}
</div>
</div>
) : (
<div className="space-y-4">
<form onSubmit={handleCredentialLogin} className="space-y-4">
<div className="text-center mb-2 text-sm text-muted-foreground">
              {isCognitoConfigured() ? 'SIGN IN WITH COGNITO' : 'SIGN IN (LOCAL DEV)'}
            </div>
            {!isCognitoConfigured() && (
              <div className="border border-primary/30 p-3 text-xs text-muted-foreground space-y-1">
                <div>SEED USERS (password: Demo123!)</div>
                <div>ali@company.com - manager</div>
                <div>sara@company.com - frontend</div>
                <div>omar@company.com - backend</div>
              </div>
            )}
<input
  type="email"
  autoComplete="email"
  placeholder="EMAIL"
  value={email}
  onChange={(e) => setEmail(e.target.value)}
  className="w-full border-2 border-primary/50 bg-background px-4 py-3 text-sm tracking-wide"
/>
<input
  type="password"
  autoComplete="current-password"
  placeholder="PASSWORD"
  value={password}
  onChange={(e) => setPassword(e.target.value)}
  className="w-full border-2 border-primary/50 bg-background px-4 py-3 text-sm tracking-wide"
/>
<button
  type="submit"
  disabled={loading}
  className="w-full border-2 border-accent py-3 hover:bg-accent hover:text-accent-foreground transition-colors disabled:opacity-50"
>
{loading ? 'AUTHENTICATING...' : 'SIGN IN'}
</button>
</form>
{showDevProfiles && (
<div className="mt-6 border-t-2 border-primary/30 pt-6">
<div className="text-center mb-3 text-xs text-muted-foreground">DEV QUICK LOGIN (LOCAL ONLY)</div>
<div className="space-y-2">
{DEV_USERS.map(({ user }) => (
<button
  key={user.id}
  type="button"
  onClick={() => handleDevLogin(user.id)}
  className="w-full border-2 border-primary/50 p-3 text-left text-sm hover:bg-primary/10"
>
{user.name} - {user.role.toUpperCase()} / {user.teamName}
</button>
))}
</div>
</div>
)}
</div>
)}
<div className="mt-6 text-center text-xs text-muted-foreground border-t-2 border-primary/30 pt-4">
PRODUCTION: AWS COGNITO USER POOL
</div>
</div>
<div className="text-center mt-4 text-xs text-muted-foreground">
DEADLINE: 22/5/2026 23:59 | Dr. John Zaki | Cloud Computing Project
</div>
</div>
</div>
  );
}
