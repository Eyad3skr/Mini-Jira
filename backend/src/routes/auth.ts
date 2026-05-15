import { Router } from 'express';
import { config } from '../config.js';
import * as usersRepo from '../db/repositories/users.js';

const router = Router();

/** Local dev login only — disabled when DEV_AUTH=false (production uses Cognito). */
router.post('/login', async (req, res) => {
  if (!config.devAuth) {
    return res.status(404).json({ error: 'Not available', code: 'NOT_FOUND' });
  }

  const { email, password } = req.body;
  if (!email || !password) {
    return res.status(400).json({ error: 'Email and password required', code: 'VALIDATION' });
  }

  const user = await usersRepo.getUserByEmail(email);
  if (!user || user.devPassword !== password) {
    return res.status(401).json({ error: 'Invalid email or password', code: 'UNAUTHORIZED' });
  }

  const teamName =
    user.teamId === 'all' ? 'ALL_TEAMS' : user.teamId.toUpperCase();

  res.json({
    token: user.userId,
    user: {
      id: user.userId,
      name: user.name,
      email: user.email,
      role: user.role,
      teamId: user.teamId,
      teamName,
    },
  });
});

export default router;
