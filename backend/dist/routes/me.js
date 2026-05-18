import { Router } from 'express';
import { authMiddleware } from '../middleware/auth.js';
import { completeUserOnboarding, ensureUserProfile, OnboardingValidationError, toMeResponse, } from '../services/userProvisioning.js';
const router = Router();
router.get('/', authMiddleware, async (req, res) => {
    const user = req.user;
    const profile = await ensureUserProfile(user.sub, {
        email: user.email,
        name: user.name,
    });
    res.json(toMeResponse(profile));
});
/** First-time setup after Cognito sign-up: display name + team */
router.put('/onboarding', authMiddleware, async (req, res) => {
    const user = req.user;
    const { name, teamId } = req.body;
    try {
        const profile = await completeUserOnboarding(user.sub, {
            name: name ?? '',
            teamId: teamId ?? '',
        });
        res.json(toMeResponse(profile));
    }
    catch (err) {
        if (err instanceof OnboardingValidationError) {
            return res.status(400).json({ error: err.message, code: 'VALIDATION' });
        }
        throw err;
    }
});
export default router;
