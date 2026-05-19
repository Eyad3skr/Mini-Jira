import { Router } from 'express';
import { ulid } from 'ulid';
import { v4 as uuidv4 } from 'uuid';
import * as auditRepo from '../db/repositories/audit.js';
import * as commentsRepo from '../db/repositories/comments.js';
import * as tasksRepo from '../db/repositories/tasks.js';
import * as teamsRepo from '../db/repositories/teams.js';
import * as usersRepo from '../db/repositories/users.js';
import type { AuthenticatedRequest } from '../middleware/auth.js';
import { authMiddleware, requireRole } from '../middleware/auth.js';
import { assertTaskAccess, canAccessTeam, canUpdateTaskStatus } from '../middleware/teamAccess.js';
import { publishTaskAssignment } from '../services/events.js';
import { getUploadPresignedUrl } from '../services/s3.js';
import { putMetric } from '../services/metrics.js';
import type { Task, TaskPriority, TaskStatus } from '../types.js';
import { routeParam } from '../utils/routeParam.js';
import { VALID_PRIORITIES, VALID_STATUSES } from '../types.js';
import { toTaskResponse, toTaskResponses } from '../utils/taskMapper.js';

const router = Router();

router.get('/', authMiddleware, async (req, res) => {
  const user = (req as AuthenticatedRequest).user;
  const filterTeamId = req.query.teamId as string | undefined;

  let tasks: Task[];

  if (user.role === 'manager' || user.role === 'admin') {
    if (filterTeamId && filterTeamId !== 'all') {
      tasks = await tasksRepo.listTasksByTeam(filterTeamId);
    } else {
      tasks = await tasksRepo.listAllTasks();
    }
  } else {
    if (!user.teamId) {
      return res.json([]);
    }
    tasks = await tasksRepo.listTasksByTeam(user.teamId);
  }

  res.json(await toTaskResponses(tasks));
});

router.post('/', authMiddleware, requireRole('manager', 'admin'), async (req, res) => {
  const user = (req as AuthenticatedRequest).user;
  const {
    title,
    description,
    priority,
    deadline,
    assigneeId,
    teamId,
    projectId,
  } = req.body;

  if (!title || !teamId || !assigneeId || !projectId) {
    return res.status(400).json({ error: 'Missing required fields', code: 'VALIDATION' });
  }

  if (!VALID_PRIORITIES.includes(priority)) {
    return res.status(400).json({ error: 'Invalid priority', code: 'VALIDATION' });
  }

  const deadlineValue = typeof deadline === 'string' ? deadline.trim() : '';
  if (!deadlineValue) {
    return res.status(400).json({ error: 'Date is required', code: 'VALIDATION' });
  }

  const assignee = await usersRepo.getUser(assigneeId);
  const team = await teamsRepo.getTeam(teamId);
  if (!assignee || !team) {
    return res.status(400).json({ error: 'Invalid assignee or team', code: 'VALIDATION' });
  }

  const now = new Date().toISOString();
  const task: Task = {
    taskId: uuidv4(),
    projectId,
    title,
    description: description ?? '',
    status: 'todo',
    priority: priority as TaskPriority,
    deadline: deadlineValue,
    assigneeId,
    assigneeName: assignee.name ?? assignee.email,
    teamId,
    teamName: team.name,
    createdBy: user.sub,
    createdAt: now,
    updatedAt: now,
    imageKeys: [],
  };

  await tasksRepo.createTask(task);
  await putMetric('TasksCreated', 1, { TeamId: teamId });

  await publishTaskAssignment({
    taskId: task.taskId,
    assigneeId,
    teamId,
    title: task.title,
    assigneeEmail: assignee.email,
  });

  res.status(201).json(await toTaskResponse(task));
});

router.get('/:id', authMiddleware, async (req, res) => {
  const user = (req as AuthenticatedRequest).user;
  const task = await tasksRepo.getTask(routeParam(req.params.id));
  if (!task) return res.status(404).json({ error: 'Task not found', code: 'NOT_FOUND' });
  if (!assertTaskAccess(user, task, res)) return;
  res.json(await toTaskResponse(task));
});

router.patch('/:id', authMiddleware, async (req, res) => {
  const user = (req as AuthenticatedRequest).user;
  const task = await tasksRepo.getTask(routeParam(req.params.id));
  if (!task) return res.status(404).json({ error: 'Task not found', code: 'NOT_FOUND' });
  if (!assertTaskAccess(user, task, res)) return;

  const isManager = user.role === 'manager' || user.role === 'admin';
  if (!isManager && Object.keys(req.body).some((k) => k !== 'status')) {
    return res.status(403).json({ error: 'Employees can only update status', code: 'FORBIDDEN' });
  }

  const updates: Partial<Task> = {};
  if (req.body.title) updates.title = req.body.title;
  if (req.body.description !== undefined) updates.description = req.body.description;
  if (req.body.priority && VALID_PRIORITIES.includes(req.body.priority)) {
    updates.priority = req.body.priority;
  }
  if (req.body.deadline) updates.deadline = req.body.deadline;

  if (req.body.status && VALID_STATUSES.includes(req.body.status)) {
    if (!canUpdateTaskStatus(user, task)) {
      return res.status(403).json({ error: 'Cannot update status', code: 'FORBIDDEN' });
    }
    const fromStatus = task.status;
    const toStatus = req.body.status as TaskStatus;
    if (fromStatus !== toStatus) {
      const changedAt = new Date().toISOString();
      await auditRepo.createAuditEntry({
        taskId: task.taskId,
        auditKey: `${changedAt}#${ulid()}`,
        fromStatus,
        toStatus,
        changedBy: user.sub,
        changedByName: user.name,
        changedAt,
      });
      updates.status = toStatus;
      if (toStatus === 'done') {
        await putMetric('TasksClosed', 1, { TeamId: task.teamId });
      }
    }
  }

  const updated = await tasksRepo.updateTask(task.taskId, updates);
  res.json(await toTaskResponse(updated!));
});

router.post('/:id/status', authMiddleware, async (req, res) => {
  const user = (req as AuthenticatedRequest).user;
  const task = await tasksRepo.getTask(routeParam(req.params.id));
  if (!task) return res.status(404).json({ error: 'Task not found', code: 'NOT_FOUND' });
  if (!assertTaskAccess(user, task, res)) return;

  const { status } = req.body;
  if (!VALID_STATUSES.includes(status)) {
    return res.status(400).json({ error: 'Invalid status', code: 'VALIDATION' });
  }
  if (!canUpdateTaskStatus(user, task)) {
    return res.status(403).json({ error: 'Cannot update status', code: 'FORBIDDEN' });
  }

  const fromStatus = task.status;
  if (fromStatus !== status) {
    const changedAt = new Date().toISOString();
    await auditRepo.createAuditEntry({
      taskId: task.taskId,
      auditKey: `${changedAt}#${ulid()}`,
      fromStatus,
      toStatus: status,
      changedBy: user.sub,
      changedByName: user.name,
      changedAt,
    });
    if (status === 'done') {
      await putMetric('TasksClosed', 1, { TeamId: task.teamId });
    }
  }

  const updated = await tasksRepo.updateTask(task.taskId, { status });
  res.json(await toTaskResponse(updated!));
});

router.delete('/:id', authMiddleware, requireRole('manager', 'admin'), async (req, res) => {
  const task = await tasksRepo.getTask(routeParam(req.params.id));
  if (!task) return res.status(404).json({ error: 'Task not found', code: 'NOT_FOUND' });
  await tasksRepo.deleteTask(task.taskId);
  res.status(204).send();
});

router.get('/:id/comments', authMiddleware, async (req, res) => {
  const user = (req as AuthenticatedRequest).user;
  const task = await tasksRepo.getTask(routeParam(req.params.id));
  if (!task) return res.status(404).json({ error: 'Task not found', code: 'NOT_FOUND' });
  if (!assertTaskAccess(user, task, res)) return;
  const comments = await commentsRepo.listComments(task.taskId);
  res.json(comments);
});

router.post('/:id/comments', authMiddleware, async (req, res) => {
  const user = (req as AuthenticatedRequest).user;
  const task = await tasksRepo.getTask(routeParam(req.params.id));
  if (!task) return res.status(404).json({ error: 'Task not found', code: 'NOT_FOUND' });
  if (!assertTaskAccess(user, task, res)) return;

  const { body } = req.body;
  if (!body?.trim()) {
    return res.status(400).json({ error: 'Comment body required', code: 'VALIDATION' });
  }

  const comment = await commentsRepo.createComment({
    taskId: task.taskId,
    commentId: ulid(),
    authorId: user.sub,
    authorName: user.name,
    body: body.trim(),
    createdAt: new Date().toISOString(),
  });

  res.status(201).json(comment);
});

router.get('/:id/audit', authMiddleware, async (req, res) => {
  const user = (req as AuthenticatedRequest).user;
  const task = await tasksRepo.getTask(routeParam(req.params.id));
  if (!task) return res.status(404).json({ error: 'Task not found', code: 'NOT_FOUND' });
  if (!assertTaskAccess(user, task, res)) return;
  const audit = await auditRepo.listAuditForTask(task.taskId);
  res.json(audit);
});

router.post('/:id/image/upload-url', authMiddleware, async (req, res) => {
  const user = (req as AuthenticatedRequest).user;
  const task = await tasksRepo.getTask(routeParam(req.params.id));
  if (!task) return res.status(404).json({ error: 'Task not found', code: 'NOT_FOUND' });
  if (!assertTaskAccess(user, task, res)) return;

  const { filename, contentType } = req.body;
  if (!filename || !contentType) {
    return res.status(400).json({ error: 'filename and contentType required', code: 'VALIDATION' });
  }

  const version = (task.imageKeys?.length ?? 0) + 1;
  const key = `tasks/${task.taskId}/v${version}/${filename}`;
  const uploadUrl = await getUploadPresignedUrl(key, contentType);

  const imageKeys = [
    ...(task.imageKeys ?? []),
    { version, originalKey: key, uploadedAt: new Date().toISOString() },
  ];
  await tasksRepo.updateTask(task.taskId, { imageKeys });

  res.json({ uploadUrl, key, version });
});

export default router;
