import { Router } from 'express';
import { v4 as uuidv4 } from 'uuid';
import * as projectsRepo from '../db/repositories/projects.js';
import type { AuthenticatedRequest } from '../middleware/auth.js';
import { authMiddleware, requireRole } from '../middleware/auth.js';
import { canAccessTeam } from '../middleware/teamAccess.js';
import { routeParam } from '../utils/routeParam.js';

const router = Router();

router.get('/', authMiddleware, async (req, res) => {
  const user = (req as AuthenticatedRequest).user;
  const teamId = req.query.teamId as string | undefined;

  if (user.role === 'manager' || user.role === 'admin') {
    const projects = await projectsRepo.listProjects(teamId);
    return res.json(projects);
  }

  if (!user.teamId) {
    return res.json([]);
  }
  const projects = await projectsRepo.listProjects(user.teamId);
  res.json(projects.filter((p) => canAccessTeam(user, p.teamId)));
});

router.post('/', authMiddleware, requireRole('manager', 'admin'), async (req, res) => {
  const user = (req as AuthenticatedRequest).user;
  const { name, description, teamId } = req.body;
  if (!name || !teamId) {
    return res.status(400).json({ error: 'name and teamId required', code: 'VALIDATION' });
  }

  const now = new Date().toISOString();
  const project = await projectsRepo.createProject({
    projectId: uuidv4(),
    name,
    description: description ?? '',
    teamId,
    createdBy: user.sub,
    createdAt: now,
    updatedAt: now,
  });

  res.status(201).json(project);
});

router.get('/:id', authMiddleware, async (req, res) => {
  const user = (req as AuthenticatedRequest).user;
  const project = await projectsRepo.getProject(routeParam(req.params.id));
  if (!project) return res.status(404).json({ error: 'Not found', code: 'NOT_FOUND' });
  if (!canAccessTeam(user, project.teamId)) {
    return res.status(403).json({ error: 'Forbidden', code: 'FORBIDDEN' });
  }
  res.json(project);
});

router.patch('/:id', authMiddleware, requireRole('manager', 'admin'), async (req, res) => {
  const updated = await projectsRepo.updateProject(routeParam(req.params.id), req.body);
  if (!updated) return res.status(404).json({ error: 'Not found', code: 'NOT_FOUND' });
  res.json(updated);
});

router.delete('/:id', authMiddleware, requireRole('manager', 'admin'), async (req, res) => {
  const ok = await projectsRepo.deleteProject(routeParam(req.params.id));
  if (!ok) return res.status(404).json({ error: 'Not found', code: 'NOT_FOUND' });
  res.status(204).send();
});

export default router;
