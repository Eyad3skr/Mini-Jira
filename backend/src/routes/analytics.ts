import { Router } from 'express';
import * as tasksRepo from '../db/repositories/tasks.js';
import type { AuthenticatedRequest } from '../middleware/auth.js';
import { authMiddleware, requireRole } from '../middleware/auth.js';
import type { Task, TaskStatus } from '../types.js';

const router = Router();

router.get('/summary', authMiddleware, requireRole('manager', 'admin'), async (_req, res) => {
  const tasks = await tasksRepo.listAllTasks();
  const today = new Date().toISOString().split('T')[0];

  const byTeam: Record<string, Record<TaskStatus, number>> = {};
  const byStatus: Record<TaskStatus, number> = {
    todo: 0,
    in_progress: 0,
    in_review: 0,
    done: 0,
  };
  let overdue = 0;

  for (const task of tasks) {
    byStatus[task.status]++;
    if (task.deadline < today && task.status !== 'done') overdue++;
    if (!byTeam[task.teamId]) {
      byTeam[task.teamId] = { todo: 0, in_progress: 0, in_review: 0, done: 0 };
    }
    byTeam[task.teamId][task.status]++;
  }

  const createdPerDay: Record<string, number> = {};
  for (const task of tasks) {
    const day = task.createdAt.split('T')[0];
    createdPerDay[day] = (createdPerDay[day] ?? 0) + 1;
  }

  const closedPerTeam: Record<string, number> = {};
  for (const task of tasks.filter((t: Task) => t.status === 'done')) {
    closedPerTeam[task.teamId] = (closedPerTeam[task.teamId] ?? 0) + 1;
  }

  res.json({
    totalTasks: tasks.length,
    byStatus,
    byTeam,
    overdue,
    createdPerDay,
    closedPerTeam,
  });
});

export default router;
