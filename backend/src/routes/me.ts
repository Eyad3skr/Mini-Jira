import { Router } from 'express';
import type { AuthenticatedRequest } from '../middleware/auth.js';
import { authMiddleware } from '../middleware/auth.js';
import { ensureAssigneeEmailSubscription } from '../services/snsAssignee.js';
import {
  completeUserOnboarding,
  ensureUserProfile,
  OnboardingValidationError,
  toMeResponse,
} from '../services/userProvisioning.js';

const router = Router();

router.get('/', authMiddleware, async (req, res) => {
  const user = (req as AuthenticatedRequest).user;
  const profileEmail = (req.headers['x-profile-email'] as string | undefined)?.trim();
  const profile = await ensureUserProfile(user.sub, {
    email: profileEmail || user.email,
    name: user.name,
  });
  res.json(toMeResponse(profile));
});

/** First-time setup after Cognito sign-up: display name + team */
router.put('/onboarding', authMiddleware, async (req, res) => {
  const user = (req as AuthenticatedRequest).user;
  const { name, teamId } = req.body as { name?: string; teamId?: string };

  try {
    const body = req.body as { name?: string; teamId?: string; email?: string };
    const profile = await completeUserOnboarding(user.sub, {
      name: name ?? '',
      teamId: teamId ?? '',
      email: body.email?.trim() || user.email,
    });
    await ensureAssigneeEmailSubscription(profile.userId, profile.email);
    res.json(toMeResponse(profile));
  } catch (err) {
    if (err instanceof OnboardingValidationError) {
      return res.status(400).json({ error: err.message, code: 'VALIDATION' });
    }
    throw err;
  }
});

export default router;
