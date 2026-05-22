import { useEffect, useState } from 'react';
import { toast } from 'sonner';
import { Pencil, Plus, Trash2, Users } from 'lucide-react';
import { apiFetch, ApiError } from '../../lib/api';
import {
  deleteTeam,
  fetchPickableTeams,
  fetchTeamDeletePreview,
  updateTeam,
  type TeamDeletePreview,
} from '../../lib/teams';
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
  const [editingTeam, setEditingTeam] = useState<Team | null>(null);
  const [editName, setEditName] = useState('');
  const [deletingTeam, setDeletingTeam] = useState<Team | null>(null);
  const [deletePreview, setDeletePreview] = useState<TeamDeletePreview | null>(null);
  const [deletePreviewLoading, setDeletePreviewLoading] = useState(false);
  const [deleteConfirmId, setDeleteConfirmId] = useState('');
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

  const openEdit = (team: Team) => {
    setEditingTeam(team);
    setEditName(team.name);
  };

  const handleUpdate = async () => {
    if (!editingTeam || !editName.trim()) return;
    try {
      await updateTeam(editingTeam.teamId, editName);
      toast.success('Team updated');
      setEditingTeam(null);
      load();
    } catch (e) {
      toast.error(e instanceof ApiError ? e.message : 'Failed');
    }
  };

  const openDelete = async (team: Team) => {
    setDeletingTeam(team);
    setDeleteConfirmId('');
    setDeletePreview(null);
    setDeletePreviewLoading(true);
    try {
      const preview = await fetchTeamDeletePreview(team.teamId);
      setDeletePreview(preview);
    } catch (e) {
      toast.error(e instanceof ApiError ? e.message : 'Failed to load delete preview');
      setDeletingTeam(null);
    } finally {
      setDeletePreviewLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!deletingTeam) return;
    if (deleteConfirmId !== deletingTeam.teamId) {
      toast.error('Type the team ID to confirm deletion');
      return;
    }
    try {
      await deleteTeam(deletingTeam.teamId);
      toast.success('Team deleted');
      setDeletingTeam(null);
      setDeletePreview(null);
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
                <div className="flex items-start justify-between gap-2 mb-3">
                  <div className="text-center flex-1 min-w-0">
                    <div className="text-2xl text-accent mb-1 truncate">{t.name}</div>
                    <div className="text-xs text-muted-foreground">ID: {t.teamId}</div>
                  </div>
                  {isManager && (
                    <div className="flex gap-1 shrink-0">
                      <button
                        type="button"
                        onClick={() => openEdit(t)}
                        className="p-1.5 border border-primary/50 text-muted-foreground hover:text-accent hover:border-accent"
                        title="Edit display name"
                      >
                        <Pencil size={16} />
                      </button>
                      <button
                        type="button"
                        onClick={() => openDelete(t)}
                        className="p-1.5 border border-destructive/50 text-destructive hover:bg-destructive hover:text-destructive-foreground"
                        title="Delete team"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  )}
                </div>
                {isManager && (
                  <div className="border-t border-primary/30 pt-3">
                    <div className="flex items-center gap-2 text-xs text-muted-foreground mb-2">
                      <Users size={14} />
                      <span>MEMBERS ({members.length})</span>
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
            <p className="text-xs text-muted-foreground mb-3">
              Team ID cannot be changed after creation.
            </p>
            <input
              className="w-full border-2 border-primary/50 px-3 py-2 mb-3"
              placeholder="TEAM ID (e.g. mobile)"
              value={teamId}
              onChange={(e) => setTeamId(e.target.value.toLowerCase())}
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

      {editingTeam && (
        <div
          className="fixed inset-0 bg-background/80 z-50 flex items-center justify-center"
          onClick={() => setEditingTeam(null)}
        >
          <div
            className="border-4 border-accent p-6 bg-background max-w-md w-full"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="text-xl mb-2">[ EDIT TEAM ]</h3>
            <p className="text-xs text-muted-foreground mb-4">ID: {editingTeam.teamId} (immutable)</p>
            <input
              className="w-full border-2 border-primary/50 px-3 py-2 mb-4"
              placeholder="DISPLAY NAME"
              value={editName}
              onChange={(e) => setEditName(e.target.value)}
            />
            <button
              onClick={handleUpdate}
              className="w-full border-2 border-accent py-2 hover:bg-accent hover:text-accent-foreground"
            >
              SAVE
            </button>
          </div>
        </div>
      )}

      {deletingTeam && (
        <div
          className="fixed inset-0 bg-background/80 z-50 flex items-center justify-center"
          onClick={() => setDeletingTeam(null)}
        >
          <div
            className="border-4 border-destructive p-6 bg-background max-w-md w-full"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="text-xl mb-2 text-destructive">[ DELETE TEAM ]</h3>
            {deletePreviewLoading ? (
              <p className="text-muted-foreground mb-4">Loading impact...</p>
            ) : deletePreview ? (
              <div className="text-sm space-y-2 mb-4">
                <p>
                  Delete <span className="text-accent">{deletePreview.name}</span> (
                  {deletePreview.teamId})?
                </p>
                <p className="text-muted-foreground">
                  This permanently removes:
                </p>
                <ul className="list-disc list-inside text-muted-foreground">
                  <li>{deletePreview.users} member profile(s) in the app</li>
                  <li>{deletePreview.projects} project(s) linked to this team</li>
                  <li>{deletePreview.tasks} task(s) and their comments</li>
                </ul>
                <p className="text-xs text-muted-foreground">
                  Cognito sign-in accounts are not deleted. Removed members may need to complete
                  onboarding again if they sign in later.
                </p>
              </div>
            ) : null}
            <input
              className="w-full border-2 border-destructive/50 px-3 py-2 mb-4"
              placeholder={`Type ${deletingTeam.teamId} to confirm`}
              value={deleteConfirmId}
              onChange={(e) => setDeleteConfirmId(e.target.value)}
            />
            <button
              onClick={handleDelete}
              disabled={deletePreviewLoading || deleteConfirmId !== deletingTeam.teamId}
              className="w-full border-2 border-destructive py-2 text-destructive hover:bg-destructive hover:text-destructive-foreground disabled:opacity-40 disabled:pointer-events-none"
            >
              DELETE TEAM
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
