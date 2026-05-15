import { Router } from 'express';
import * as usersRepo from '../db/repositories/users.js';
import type { AuthenticatedRequest } from '../middleware/auth.js';
import { authMiddleware } from '../middleware/auth.js';

const router = Router();

router.get('/', authMiddleware, async (req, res) => {
  const user = (req as AuthenticatedRequest).user;
  const profile = await usersRepo.getUser(user.sub);
  const teamName =
    user.teamId === 'all'
      ? 'ALL_TEAMS'
      : (profile?.teamId ?? user.teamId).toUpperCase();

  res.json({
    id: user.sub,
    name: profile?.name ?? user.name,
    email: profile?.email ?? user.email,
    role: user.role,
    teamId: user.teamId,
    teamName,
  });
});

export default router;
