import { useEffect, useState } from 'react';
import { toast } from 'sonner';
import { apiFetch } from '../../lib/api';
import { completeOnboarding } from '../../lib/auth';
import type { TeamOption, User } from '../../lib/types';
import LoginShell from './LoginShell';

interface OnboardingScreenProps {
  user: User;
  onComplete: (user: User) => void;
}

export default function OnboardingScreen({ user, onComplete }: OnboardingScreenProps) {
  const [name, setName] = useState('');
  const [teamId, setTeamId] = useState('');
  const [teams, setTeams] = useState<TeamOption[]>([]);
  const [loadingTeams, setLoadingTeams] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    apiFetch<TeamOption[]>('/api/teams')
      .then((list) => {
        const pickable = list.filter((t) => t.teamId !== 'all');
        setTeams(pickable);
        if (pickable.length === 1) setTeamId(pickable[0].teamId);
      })
      .catch(() => toast.error('Could not load teams'))
      .finally(() => setLoadingTeams(false));
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || name.trim().length < 2) {
      toast.error('Enter your name (at least 2 characters)');
      return;
    }
    if (!teamId) {
      toast.error('Choose a team');
      return;
    }
    setSubmitting(true);
    try {
      const updated = await completeOnboarding(name, teamId);
      toast.success('Profile saved — welcome to Mini-Jira');
      onComplete(updated);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Could not save profile');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <LoginShell busy={false}>
      <form onSubmit={handleSubmit} className="space-y-5">
        <div className="text-center mb-2">
          <h2 className="text-xl tracking-widest text-primary">FINISH SIGN-UP</h2>
          <p className="text-xs text-muted-foreground mt-1">Choose your name and team</p>
        </div>

        <p className="text-sm text-center text-muted-foreground">
          Complete your profile to finish sign-up. Signed in as{' '}
          <span className="text-accent">{user.email}</span>
        </p>

        <div>
          <label htmlFor="onboarding-name" className="block text-xs text-muted-foreground mb-1">
            YOUR NAME
          </label>
          <input
            id="onboarding-name"
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g. Ali Hassan"
            autoComplete="name"
            className="w-full border-2 border-primary/50 bg-background px-3 py-2 focus:border-accent outline-none"
            disabled={submitting}
          />
        </div>

        <div>
          <label htmlFor="onboarding-team" className="block text-xs text-muted-foreground mb-1">
            YOUR TEAM
          </label>
          <select
            id="onboarding-team"
            value={teamId}
            onChange={(e) => setTeamId(e.target.value)}
            className="w-full border-2 border-primary/50 bg-background px-3 py-2 focus:border-accent outline-none"
            disabled={submitting || loadingTeams}
          >
            <option value="">{loadingTeams ? 'Loading teams...' : 'Select a team'}</option>
            {teams.map((t) => (
              <option key={t.teamId} value={t.teamId}>
                {t.name}
              </option>
            ))}
          </select>
        </div>

        <button
          type="submit"
          disabled={submitting || loadingTeams}
          className="w-full border-2 border-accent py-3 hover:bg-accent hover:text-accent-foreground transition-colors disabled:opacity-50"
        >
          {submitting ? 'SAVING...' : 'CONTINUE TO MINI-JIRA'}
        </button>
      </form>
    </LoginShell>
  );
}
