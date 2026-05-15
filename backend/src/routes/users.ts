import { Router } from 'express';
import * as usersRepo from '../db/repositories/users.js';
import type { AuthenticatedRequest } from '../middleware/auth.js';
import { authMiddleware, requireRole } from '../middleware/auth.js';

const router = Router();

router.get('/', authMiddleware, requireRole('manager', 'admin'), async (req, res) => {
  const teamId = req.query.teamId as string | undefined;
  const users = teamId
    ? await usersRepo.listUsersByTeam(teamId)
    : await usersRepo.listAllUsers();
  res.json(users.filter((u) => u.role === 'employee'));
});

export default router;
