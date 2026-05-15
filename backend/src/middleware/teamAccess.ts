import type { Response } from 'express';
import type { AuthenticatedRequest } from './auth.js';
import type { Task } from '../types.js';

export function canAccessTeam(user: AuthenticatedRequest['user'], teamId: string): boolean {
  if (user.role === 'manager' || user.role === 'admin') return true;
  return user.teamId === teamId;
}

export function assertTaskAccess(user: AuthenticatedRequest['user'], task: Task, res: Response): boolean {
  if (!canAccessTeam(user, task.teamId)) {
    res.status(403).json({ error: 'Task not accessible for your team', code: 'TEAM_FORBIDDEN' });
    return false;
  }
  return true;
}

export function canUpdateTaskStatus(
  user: AuthenticatedRequest['user'],
  task: Task
): boolean {
  if (user.role === 'manager' || user.role === 'admin') return true;
  return task.assigneeId === user.sub;
}
