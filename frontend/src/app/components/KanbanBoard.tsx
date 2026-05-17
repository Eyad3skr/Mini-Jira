import { useCallback, useEffect, useState } from 'react';
import { useDrop } from 'react-dnd';
import { toast } from 'sonner';
import { apiFetch, ApiError } from '../../lib/api';
import type { AuditEntry, Comment, Task, TaskStatus, User } from '../../lib/types';
import TaskCard from './TaskCard';

interface KanbanBoardProps {
  user: User;
  selectedTeam: string;
}

const columns: { status: TaskStatus; title: string; color: string }[] = [
  { status: 'todo', title: 'TO DO', color: 'border-primary' },
  { status: 'in_progress', title: 'IN PROGRESS', color: 'border-accent' },
  { status: 'in_review', title: 'IN REVIEW', color: 'border-chart-3' },
  { status: 'done', title: 'DONE', color: 'border-muted' },
];

export default function KanbanBoard({ user, selectedTeam }: KanbanBoardProps) {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);

  const loadTasks = useCallback(async () => {
    setLoading(true);
    try {
      const params =
        user.role === 'manager' && selectedTeam !== 'all'
          ? `?teamId=${selectedTeam}`
          : '';
      const data = await apiFetch<Task[]>(`/api/tasks${params}`);
      setTasks(data);
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : 'Failed to load tasks');
    } finally {
      setLoading(false);
    }
  }, [user.role, selectedTeam]);

  useEffect(() => {
    loadTasks();
  }, [loadTasks]);

  const filteredTasks =
    user.role === 'manager'
      ? tasks
      : tasks.filter((t) => t.teamId === user.teamId);

  const canDrag = (task: Task) =>
    user.role === 'manager' || user.role === 'admin' || task.assigneeId === user.id;

  const moveTask = async (taskId: string, newStatus: TaskStatus) => {
    const task = tasks.find((t) => t.id === taskId);
    if (!task || !canDrag(task)) {
      toast.error('You can only move tasks assigned to you');
      return;
    }
    const prev = tasks;
    setTasks((t) => t.map((x) => (x.id === taskId ? { ...x, status: newStatus } : x)));
    try {
      await apiFetch(`/api/tasks/${taskId}/status`, {
        method: 'POST',
        body: JSON.stringify({ status: newStatus }),
      });
    } catch (err) {
      setTasks(prev);
      toast.error(err instanceof ApiError ? err.message : 'Failed to update status');
    }
  };

  if (loading) {
    return (
      <div className="h-full flex gap-4">
        {columns.map((col) => (
          <div key={col.status} className="flex-1 border-2 border-dashed border-primary/30 p-8 text-center text-muted-foreground">
            LOADING...
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className="h-full flex gap-4">
      {columns.map((column) => (
        <KanbanColumn
          key={column.status}
          status={column.status}
          title={column.title}
          color={column.color}
          tasks={filteredTasks.filter((t) => t.status === column.status)}
          onTaskClick={setSelectedTask}
          onMoveTask={moveTask}
          canDrop={true}
        />
      ))}

      {selectedTask && (
        <TaskDetailModal
          task={selectedTask}
          onClose={() => setSelectedTask(null)}
          onUpdated={loadTasks}
        />
      )}
    </div>
  );
}

interface KanbanColumnProps {
  status: TaskStatus;
  title: string;
  color: string;
  tasks: Task[];
  onTaskClick: (task: Task) => void;
  onMoveTask: (taskId: string, status: TaskStatus) => void;
  canDrop: boolean;
}

function KanbanColumn({ status, title, color, tasks, onTaskClick, onMoveTask, canDrop }: KanbanColumnProps) {
  const [{ isOver }, drop] = useDrop({
    accept: 'TASK',
    drop: (item: { id: string }) => onMoveTask(item.id, status),
    canDrop: () => canDrop,
    collect: (monitor) => ({ isOver: monitor.isOver() }),
  });

  return (
    <div ref={drop} className="flex-1 flex flex-col min-w-0">
      <div className={`border-2 ${color} p-3 mb-3 bg-card`}>
        <div className="flex items-center justify-between">
          <h3 className="tracking-wider">{title}</h3>
          <div className="w-8 h-8 border-2 border-current flex items-center justify-center text-sm">
            {tasks.length}
          </div>
        </div>
      </div>

      <div
        className={`flex-1 border-2 ${color} p-3 overflow-y-auto transition-colors ${
          isOver ? 'bg-primary/10' : 'bg-background'
        }`}
      >
        <div className="space-y-3">
          {tasks.length === 0 ? (
            <div className="text-center text-muted-foreground text-sm py-8 border border-dashed border-current">
              NO TASKS
            </div>
          ) : (
            tasks.map((task) => (
              <TaskCard key={task.id} task={task} onClick={onTaskClick} />
            ))
          )}
        </div>
      </div>
    </div>
  );
}

interface TaskDetailModalProps {
  task: Task;
  onClose: () => void;
  onUpdated: () => void;
}

function TaskDetailModal({ task, onClose, onUpdated }: TaskDetailModalProps) {
  const [comments, setComments] = useState<Comment[]>([]);
  const [audit, setAudit] = useState<AuditEntry[]>([]);
  const [newComment, setNewComment] = useState("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    apiFetch<Comment[]>(`/api/tasks/${task.id}/comments`).then(setComments).catch(() => {});
    apiFetch<AuditEntry[]>(`/api/tasks/${task.id}/audit`).then(setAudit).catch(() => {});
  }, [task.id]);

  const priorityColors: Record<string, string> = {
    low: "text-muted-foreground", medium: "text-chart-3", high: "text-accent", critical: "text-destructive",
  };

  const handleAddComment = async () => {
    if (!newComment.trim()) return;
    setSubmitting(true);
    try {
      const comment = await apiFetch<Comment>(`/api/tasks/${task.id}/comments`, {
        method: "POST", body: JSON.stringify({ body: newComment }),
      });
      setComments((prev) => [...prev, comment]);
      setNewComment(""); onUpdated();
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : "Failed to post comment");
    } finally { setSubmitting(false); }
  };

  return (
    <div className="fixed inset-0 bg-background/90 z-50 flex items-center justify-center p-8" onClick={onClose}>
      <div className="border-4 border-primary p-6 bg-background max-w-3xl w-full max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
        <div className="mb-6">
          <div className="flex items-start justify-between mb-4">
            <div className="flex-1">
              <h2 className="text-2xl mb-2">{task.title}</h2>
              <div className="flex gap-4 text-sm text-muted-foreground">
                <div>TASK_ID: {task.id}</div>
                <div className={priorityColors[task.priority]}>PRIORITY: {task.priority.toUpperCase()}</div>
              </div>
            </div>
            <button type="button" onClick={onClose} className="border-2 border-destructive px-4 py-2">CLOSE</button>
          </div>
          <div className="grid grid-cols-2 gap-4 border-2 border-primary/30 p-4 bg-card text-sm">
            <div><div className="text-muted-foreground">ASSIGNEE:</div><div className="text-accent">{task.assigneeName}</div></div>
            <div><div className="text-muted-foreground">TEAM:</div><div className="text-accent">{task.teamName}</div></div>
            <div><div className="text-muted-foreground">DEADLINE:</div><div className="text-accent">{task.deadline}</div></div>
            <div><div className="text-muted-foreground">STATUS:</div><div className="text-accent">{task.status.replace("_", " ").toUpperCase()}</div></div>
          </div>
        </div>
        <div className="mb-6"><div className="text-sm text-muted-foreground mb-2">DESCRIPTION:</div><div className="border-2 border-primary/30 p-4 bg-card">{task.description}</div></div>
        <div className="mb-6"><div className="text-sm text-muted-foreground mb-2">STATUS HISTORY:</div><div className="border-2 border-primary/30 p-4 bg-card text-sm space-y-2 max-h-32 overflow-y-auto">{audit.length === 0 ? <div className="text-muted-foreground">No changes yet</div> : audit.map((a) => <div key={a.auditKey}>{a.changedByName}: {a.fromStatus} to {a.toStatus}</div>)}</div></div>
        <div><div className="text-sm text-muted-foreground mb-2">COMMENTS ({comments.length}):</div>
        <div className="border-2 border-primary/30 p-4 bg-card space-y-3 mb-3 max-h-40 overflow-y-auto">
          {comments.length === 0 ? <div className="text-center text-muted-foreground py-2 text-sm">No comments yet</div> : comments.map((c) => (
            <div key={c.commentId} className="border-b border-primary/20 pb-2"><div className="text-xs text-accent">{c.authorName}</div><div>{c.body}</div></div>
          ))}
        </div>
        <div className="flex gap-2"><input value={newComment} onChange={(e) => setNewComment(e.target.value)} placeholder="Add comment..." className="flex-1 border-2 border-primary/50 bg-background px-3 py-2 text-sm" /><button type="button" onClick={handleAddComment} disabled={submitting} className="border-2 border-accent px-4 py-2">POST</button></div>
        </div>
      </div>
    </div>
  );
}
export type { Task, TaskStatus };
