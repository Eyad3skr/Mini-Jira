import { useEffect, useState } from 'react';
import { toast } from 'sonner';
import { Plus, Users } from 'lucide-react';
import { apiFetch, ApiError } from '../../lib/api';
import { fetchPickableTeams } from '../../lib/teams';
import type { Team, User, UserProfile } from '../../lib/types';

interface TeamsViewProps {
  user: User;
}

function memberLabel(m: UserProfile): string {
  return m.name?.trim() || m.email;
}

export default function TeamsView({ user }: TeamsViewProps) {
  const [teams, setTeams] = useState<Team[]>([]);
  const [membersByTeam, setMembersByTeam] = useState<Record<string, UserProfile[]>>({});
  const [loading, setLoading] = useState(true);
  const [teamId, setTeamId] = useState('');
  const [name, setName] = useState('');
  const [showForm, setShowForm] = useState(false);
  const isManager = user.role === 'admin' || user.role === 'manager';

  const load = () => {
    setLoading(true);
    fetchPickableTeams()
      .then(async (pickable) => {
        setTeams(pickable);
        if (!isManager) {
          setMembersByTeam({});
          return;
        }
        const pairs = await Promise.all(
          pickable.map(async (t) => {
            try {
              const members = await apiFetch<UserProfile[]>(
                `/api/users?teamId=${encodeURIComponent(t.teamId)}`
              );
              return [t.teamId, members] as const;
            } catch {
              return [t.teamId, []] as const;
            }
          })
        );
        setMembersByTeam(Object.fromEntries(pairs));
      })
      .catch((e) => toast.error(e instanceof ApiError ? e.message : 'Failed'))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    load();
  }, [isManager]);

  const handleCreate = async () => {
    if (!teamId || !name) return;
    try {
      await apiFetch('/api/teams', { method: 'POST', body: JSON.stringify({ teamId, name }) });
      toast.success('Team created');
      setShowForm(false);
      setTeamId('');
      setName('');
      load();
    } catch (e) {
      toast.error(e instanceof ApiError ? e.message : 'Failed');
    }
  };

  return (
    <div className="h-full flex flex-col">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-3xl tracking-wider">[ TEAMS ]</h2>
        {isManager && (
          <button
            onClick={() => setShowForm(true)}
            className="border-2 border-accent px-4 py-2 flex items-center gap-2 hover:bg-accent hover:text-accent-foreground"
          >
            <Plus size={18} /> NEW TEAM
          </button>
        )}
      </div>
      {loading ? (
        <div className="border-2 border-dashed border-primary/30 p-12 text-center text-muted-foreground">
          LOADING...
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {teams.map((t) => {
            const members = membersByTeam[t.teamId] ?? [];
            return (
              <div key={t.teamId} className="border-2 border-primary p-4 bg-card">
                <div className="text-center mb-3">
                  <div className="text-2xl text-accent mb-1">{t.name}</div>
                  <div className="text-xs text-muted-foreground">ID: {t.teamId}</div>
                </div>
                {isManager && (
                  <div className="border-t border-primary/30 pt-3">
                    <div className="flex items-center gap-2 text-xs text-muted-foreground mb-2">
                      <Users size={14} />
                      <span>
                        MEMBERS ({members.length})
                      </span>
                    </div>
                    {members.length === 0 ? (
                      <p className="text-xs text-muted-foreground italic">No members yet</p>
                    ) : (
                      <ul className="space-y-1.5 text-sm">
                        {members.map((m) => (
                          <li
                            key={m.userId}
                            className="flex flex-col border border-primary/20 px-2 py-1.5 bg-background/50"
                          >
                            <span className="text-accent">{memberLabel(m)}</span>
                            <span className="text-xs text-muted-foreground truncate">{m.email}</span>
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
      {showForm && (
        <div
          className="fixed inset-0 bg-background/80 z-50 flex items-center justify-center"
          onClick={() => setShowForm(false)}
        >
          <div
            className="border-4 border-accent p-6 bg-background max-w-md w-full"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="text-xl mb-4">[ NEW TEAM ]</h3>
            <input
              className="w-full border-2 border-primary/50 px-3 py-2 mb-3"
              placeholder="TEAM ID (e.g. mobile)"
              value={teamId}
              onChange={(e) => setTeamId(e.target.value)}
            />
            <input
              className="w-full border-2 border-primary/50 px-3 py-2 mb-4"
              placeholder="DISPLAY NAME"
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
            <button
              onClick={handleCreate}
              className="w-full border-2 border-accent py-2 hover:bg-accent hover:text-accent-foreground"
            >
              CREATE
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
