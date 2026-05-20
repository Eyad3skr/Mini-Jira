import { useEffect, useState } from 'react';
import { toast } from 'sonner';
import { Filter, Plus } from 'lucide-react';
import { apiFetch, ApiError } from '../../lib/api';
import { uploadTaskImage, validateTaskImageFile, waitForTaskImage } from '../../lib/taskImage';
import { fetchPickableTeams } from '../../lib/teams';
import type { Project, Task, TaskPriority, Team, User, UserProfile } from '../../lib/types';
import KanbanBoard from './KanbanBoard';

interface DashboardProps {
  user: User;
}

export default function Dashboard({ user }: DashboardProps) {
  const [selectedTeam, setSelectedTeam] = useState<string>(user.role === 'manager' ? 'all' : user.teamId);
  const [showCreateTask, setShowCreateTask] = useState(false);
  const [projects, setProjects] = useState<Project[]>([]);
  const [employees, setEmployees] = useState<UserProfile[]>([]);
  const [pickableTeams, setPickableTeams] = useState<Team[]>([]);
  const [form, setForm] = useState({
    title: '',
    description: '',
    priority: 'medium' as TaskPriority,
    deadline: '',
    assigneeId: '',
    teamId: '',
    projectId: '',
  });
  const [submitting, setSubmitting] = useState(false);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);

  const isManager = user.role === 'manager' || user.role === 'admin';

  useEffect(() => {
    if (!isManager) return;
    fetchPickableTeams()
      .then((teams) => {
        setPickableTeams(teams);
        setForm((f) => ({
          ...f,
          teamId: f.teamId && teams.some((t) => t.teamId === f.teamId) ? f.teamId : (teams[0]?.teamId ?? ''),
        }));
      })
      .catch(() => toast.error('Could not load teams'));
    apiFetch<Project[]>('/api/projects').then(setProjects).catch(() => {});
    apiFetch<UserProfile[]>('/api/users').then(setEmployees).catch(() => {});
  }, [isManager]);

  useEffect(() => {
    if (!showCreateTask || !isManager) return;
    fetchPickableTeams()
      .then(setPickableTeams)
      .catch(() => {});
  }, [showCreateTask, isManager]);

  const filterTeams: { teamId: string; label: string }[] = isManager
    ? [{ teamId: 'all', label: 'ALL_TEAMS' }, ...pickableTeams.map((t) => ({ teamId: t.teamId, label: t.name }))]
    : [{ teamId: user.teamId, label: user.teamName || user.teamId.toUpperCase() }];

  const handleCreate = async () => {
    if (!form.title || !form.assigneeId || !form.projectId) {
      toast.error('Title, assignee, and project are required');
      return;
    }
    if (!form.deadline.trim()) {
      toast.error('Date is required');
      return;
    }
    if (imageFile) {
      const imageErr = validateTaskImageFile(imageFile);
      if (imageErr) {
        toast.error(imageErr);
        return;
      }
    }

    setSubmitting(true);
    try {
      const created = await apiFetch<Task>('/api/tasks', {
        method: 'POST',
        body: JSON.stringify(form),
      });
      if (imageFile) {
        toast.info('Uploading image…');
        await uploadTaskImage(created.id, imageFile);
        await waitForTaskImage(created.id, { maxAttempts: 20, intervalMs: 1500 });
      }
      toast.success(imageFile ? 'Task created with image' : 'Task created');
      setShowCreateTask(false);
      setImageFile(null);
      setForm({
        title: '',
        description: '',
        priority: 'medium',
        deadline: '',
        assigneeId: '',
        teamId: pickableTeams[0]?.teamId ?? '',
        projectId: '',
      });
      setRefreshKey((k) => k + 1);
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : 'Failed to create task');
    } finally {
      setSubmitting(false);
    }
  };

  const teamEmployees = employees.filter((e) => e.teamId === form.teamId);

  return (
    <div className="h-full flex flex-col">
      <div className="mb-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-3xl tracking-wider mb-2">[ TASK BOARD ]</h2>
            <div className="text-sm text-muted-foreground">
              {user.role === 'manager' ? 'MANAGER VIEW - ALL TEAMS VISIBLE' : `EMPLOYEE VIEW - ${user.teamName} ONLY`}
            </div>
          </div>
          {isManager && (
            <button
              onClick={() => setShowCreateTask(true)}
              className="border-2 border-accent px-6 py-3 flex items-center gap-2 hover:bg-accent hover:text-accent-foreground transition-colors"
            >
              <Plus size={20} />
              <span>NEW TASK</span>
            </button>
          )}
        </div>
        {isManager && (
          <div className="border-2 border-primary/30 p-4 bg-card">
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2 text-sm">
                <Filter size={16} />
                <span>FILTER:</span>
              </div>
              <div className="flex gap-2 flex-wrap">
                {filterTeams.map((team) => (
                  <button
                    key={team.teamId}
                    onClick={() => setSelectedTeam(team.teamId)}
                    className={`px-4 py-2 border-2 text-sm transition-all ${
                      selectedTeam === team.teamId
                        ? 'border-accent bg-accent text-accent-foreground'
                        : 'border-primary/50 hover:border-primary hover:bg-primary/10'
                    }`}
                  >
                    {team.label}
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>
      <div className="flex-1 overflow-hidden" key={refreshKey}>
        <KanbanBoard user={user} selectedTeam={selectedTeam} />
      </div>
      {showCreateTask && (
        <div className="fixed inset-0 bg-background/80 z-50 flex items-center justify-center" onClick={() => setShowCreateTask(false)}>
          <div className="border-4 border-accent p-8 bg-background max-w-2xl w-full max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
            <h3 className="text-2xl mb-4">[ CREATE NEW TASK ]</h3>
            <div className="space-y-4 text-sm">
              <input className="w-full border-2 border-primary/50 bg-background px-3 py-2" placeholder="TITLE" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} />
              <textarea className="w-full border-2 border-primary/50 bg-background px-3 py-2 min-h-[80px]" placeholder="DESCRIPTION" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
              <div className="grid grid-cols-2 gap-4">
                <select className="border-2 border-primary/50 bg-background px-3 py-2" value={form.priority} onChange={(e) => setForm({ ...form, priority: e.target.value as TaskPriority })}>
                  <option value="low">LOW</option>
                  <option value="medium">MEDIUM</option>
                  <option value="high">HIGH</option>
                  <option value="critical">CRITICAL</option>
                </select>
                <input type="date" className="border-2 border-primary/50 bg-background px-3 py-2" value={form.deadline} onChange={(e) => setForm({ ...form, deadline: e.target.value })} />
              </div>
              <select className="w-full border-2 border-primary/50 bg-background px-3 py-2" value={form.projectId} onChange={(e) => setForm({ ...form, projectId: e.target.value })}>
                <option value="">SELECT PROJECT</option>
                {projects.map((p) => (
                  <option key={p.projectId} value={p.projectId}>{p.name}</option>
                ))}
              </select>
              <select
                className="w-full border-2 border-primary/50 bg-background px-3 py-2"
                value={form.teamId}
                onChange={(e) => setForm({ ...form, teamId: e.target.value, assigneeId: '' })}
              >
                <option value="">{pickableTeams.length ? 'SELECT TEAM' : 'NO TEAMS — CREATE ONE IN TEAMS'}</option>
                {pickableTeams.map((t) => (
                  <option key={t.teamId} value={t.teamId}>
                    {t.name}
                  </option>
                ))}
              </select>
              <select className="w-full border-2 border-primary/50 bg-background px-3 py-2" value={form.assigneeId} onChange={(e) => setForm({ ...form, assigneeId: e.target.value })}>
                <option value="">SELECT ASSIGNEE</option>
                {teamEmployees.map((e) => (
                  <option key={e.userId} value={e.userId}>
                    {e.name?.trim() || e.email}
                  </option>
                ))}
              </select>
              <div>
                <div className="text-xs text-muted-foreground mb-1">TASK IMAGE (OPTIONAL)</div>
                <input
                  type="file"
                  accept="image/jpeg,image/png,image/webp,image/gif"
                  className="w-full border-2 border-primary/50 bg-background px-3 py-2 text-sm"
                  onChange={(e) => setImageFile(e.target.files?.[0] ?? null)}
                />
                {imageFile && (
                  <p className="text-xs text-accent mt-1 truncate">{imageFile.name}</p>
                )}
              </div>
            </div>
            <div className="flex gap-2 mt-6">
              <button onClick={handleCreate} disabled={submitting} className="flex-1 border-2 border-accent py-2 hover:bg-accent hover:text-accent-foreground disabled:opacity-50">
                {submitting ? 'CREATING...' : 'CREATE TASK'}
              </button>
              <button
                onClick={() => {
                  setShowCreateTask(false);
                  setImageFile(null);
                }}
                className="flex-1 border-2 border-primary py-2 hover:bg-primary hover:text-primary-foreground"
              >
                CANCEL
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
