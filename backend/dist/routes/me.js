import { Router } from 'express';
import { authMiddleware } from '../middleware/auth.js';
import { ensureUserProfile } from '../services/userProvisioning.js';
const router = Router();
router.get('/', authMiddleware, async (req, res) => {
    const user = req.user;
    const profile = await ensureUserProfile(user.sub, {
        email: user.email,
        name: user.name,
    });
    const teamName = profile.teamId === 'all' ? 'ALL_TEAMS' : profile.teamId.toUpperCase();
    res.json({
        id: profile.userId,
        name: profile.name,
        email: profile.email,
        role: profile.role,
        teamId: profile.teamId,
        teamName,
    });
});
export default router;
