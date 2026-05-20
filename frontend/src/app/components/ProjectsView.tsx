import { useEffect, useState } from 'react';
import { toast } from 'sonner';
import { Plus, Trash2 } from 'lucide-react';
import { apiFetch, ApiError } from '../../lib/api';
import { fetchPickableTeams } from '../../lib/teams';
import type { Project, Team, User } from '../../lib/types';

interface ProjectsViewProps { user: User; }

export default function ProjectsView({ user }: ProjectsViewProps) {
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [teamId, setTeamId] = useState('');
  const [teams, setTeams] = useState<Team[]>([]);
  const isManager = user.role === 'manager' || user.role === 'admin';

  const load = () => {
    setLoading(true);
    apiFetch<Project[]>('/api/projects').then(setProjects)
      .catch((e) => toast.error(e instanceof ApiError ? e.message : 'Failed'))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    load();
    if (!isManager) return;
    fetchPickableTeams()
      .then((list) => {
        setTeams(list);
        setTeamId((prev) => (prev && list.some((t) => t.teamId === prev) ? prev : (list[0]?.teamId ?? '')));
      })
      .catch(() => toast.error('Could not load teams'));
  }, [isManager]);

  const handleCreate = async () => {
    if (!name.trim()) return;
    try {
      await apiFetch('/api/projects', { method: 'POST', body: JSON.stringify({ name, description, teamId }) });
      toast.success('Project created');
      setShowForm(false); setName(''); setDescription(''); load();
    } catch (e) { toast.error(e instanceof ApiError ? e.message : 'Failed'); }
  };

  const handleDelete = async (id: string) => {
    try {
      await apiFetch(`/api/projects/${id}`, { method: 'DELETE' });
      toast.success('Deleted'); load();
    } catch (e) { toast.error(e instanceof ApiError ? e.message : 'Failed'); }
  };

  return (
    <div className="h-full flex flex-col">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-3xl tracking-wider">[ PROJECTS ]</h2>
        {isManager && (
          <button onClick={() => setShowForm(true)} className="border-2 border-accent px-4 py-2 flex items-center gap-2 hover:bg-accent hover:text-accent-foreground">
            <Plus size={18} /> NEW PROJECT
          </button>
        )}
      </div>
      {loading ? (
        <div className="border-2 border-dashed border-primary/30 p-12 text-center text-muted-foreground">LOADING...</div>
      ) : projects.length === 0 ? (
        <div className="border-2 border-primary p-12 text-center text-muted-foreground">NO PROJECTS</div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {projects.map((p) => (
            <div key={p.projectId} className="border-2 border-primary/50 p-4 bg-card">
              <div className="flex justify-between mb-2">
                <h3 className="text-lg">{p.name}</h3>
                {isManager && <button onClick={() => handleDelete(p.projectId)} className="text-destructive"><Trash2 size={16} /></button>}
              </div>
              <p className="text-sm text-muted-foreground">{p.description}</p>
              <div className="text-xs text-accent mt-2">TEAM: {p.teamId.toUpperCase()}</div>
            </div>
          ))}
        </div>
      )}
      {showForm && (
        <div className="fixed inset-0 bg-background/80 z-50 flex items-center justify-center" onClick={() => setShowForm(false)}>
          <div className="border-4 border-accent p-6 bg-background max-w-md w-full" onClick={(e) => e.stopPropagation()}>
            <h3 className="text-xl mb-4">[ NEW PROJECT ]</h3>
            <input className="w-full border-2 border-primary/50 px-3 py-2 mb-3" placeholder="NAME" value={name} onChange={(e) => setName(e.target.value)} />
            <textarea className="w-full border-2 border-primary/50 px-3 py-2 mb-3" placeholder="DESCRIPTION" value={description} onChange={(e) => setDescription(e.target.value)} />
            <select className="w-full border-2 border-primary/50 px-3 py-2 mb-4" value={teamId} onChange={(e) => setTeamId(e.target.value)}>
              <option value="">{teams.length ? 'SELECT TEAM' : 'NO TEAMS'}</option>
              {teams.map((t) => (
                <option key={t.teamId} value={t.teamId}>
                  {t.name}
                </option>
              ))}
            </select>
            <button onClick={handleCreate} className="w-full border-2 border-accent py-2 hover:bg-accent hover:text-accent-foreground">CREATE</button>
          </div>
        </div>
      )}
    </div>
  );
}
