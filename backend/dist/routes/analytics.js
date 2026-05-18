import { Router } from 'express';
import * as tasksRepo from '../db/repositories/tasks.js';
import { authMiddleware, requireRole } from '../middleware/auth.js';
const router = Router();
router.get('/summary', authMiddleware, requireRole('manager', 'admin'), async (_req, res) => {
    const tasks = await tasksRepo.listAllTasks();
    const today = new Date().toISOString().split('T')[0];
    const byTeam = {};
    const byStatus = {
        todo: 0,
        in_progress: 0,
        in_review: 0,
        done: 0,
    };
    let overdue = 0;
    for (const task of tasks) {
        byStatus[task.status]++;
        if (task.deadline < today && task.status !== 'done')
            overdue++;
        if (!byTeam[task.teamId]) {
            byTeam[task.teamId] = { todo: 0, in_progress: 0, in_review: 0, done: 0 };
        }
        byTeam[task.teamId][task.status]++;
    }
    const createdPerDay = {};
    for (const task of tasks) {
        const day = task.createdAt.split('T')[0];
        createdPerDay[day] = (createdPerDay[day] ?? 0) + 1;
    }
    const closedPerTeam = {};
    for (const task of tasks.filter((t) => t.status === 'done')) {
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
