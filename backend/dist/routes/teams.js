import { Router } from 'express';
import * as teamsRepo from '../db/repositories/teams.js';
import { authMiddleware, requireRole } from '../middleware/auth.js';
import { routeParam } from '../utils/routeParam.js';
const router = Router();
router.get('/', authMiddleware, async (_req, res) => {
    const teams = await teamsRepo.listTeams();
    res.json(teams);
});
router.post('/', authMiddleware, requireRole('admin', 'manager'), async (req, res) => {
    const { teamId, name } = req.body;
    if (!teamId || !name) {
        return res.status(400).json({ error: 'teamId and name required', code: 'VALIDATION' });
    }
    const existing = await teamsRepo.getTeam(teamId);
    if (existing) {
        return res.status(409).json({ error: 'Team already exists', code: 'CONFLICT' });
    }
    const team = await teamsRepo.createTeam({
        teamId,
        name: name.toUpperCase(),
        createdAt: new Date().toISOString(),
    });
    res.status(201).json(team);
});
router.patch('/:id', authMiddleware, requireRole('admin', 'manager'), async (req, res) => {
    const updated = await teamsRepo.updateTeam(routeParam(req.params.id), req.body);
    if (!updated)
        return res.status(404).json({ error: 'Not found', code: 'NOT_FOUND' });
    res.json(updated);
});
router.delete('/:id', authMiddleware, requireRole('admin'), async (req, res) => {
    const ok = await teamsRepo.deleteTeam(routeParam(req.params.id));
    if (!ok)
        return res.status(404).json({ error: 'Not found', code: 'NOT_FOUND' });
    res.status(204).send();
});
export default router;
