import { Router } from 'express';
import { normalizeTeamName, validateTeamId, validateTeamName, } from '../constants/teams.js';
import * as teamsRepo from '../db/repositories/teams.js';
import { authMiddleware, requireRole } from '../middleware/auth.js';
import { deleteTeamAndDependencies, getTeamDeletePreview, syncTeamDisplayName, TeamLifecycleError, } from '../services/teamLifecycle.js';
import { routeParam } from '../utils/routeParam.js';
const router = Router();
function handleLifecycleError(err, res) {
    if (err instanceof TeamLifecycleError) {
        const status = err.code === 'NOT_FOUND' ? 404 : err.code === 'FORBIDDEN' ? 403 : 400;
        res.status(status).json({ error: err.message, code: err.code });
        return true;
    }
    return false;
}
router.get('/', authMiddleware, async (_req, res) => {
    const teams = await teamsRepo.listTeams();
    res.json(teams);
});
router.post('/', authMiddleware, requireRole('admin', 'manager'), async (req, res) => {
    const rawTeamId = req.body?.teamId;
    const rawName = req.body?.name;
    const teamIdError = validateTeamId(typeof rawTeamId === 'string' ? rawTeamId : '');
    if (teamIdError) {
        return res.status(400).json({ error: teamIdError, code: 'VALIDATION' });
    }
    const nameError = validateTeamName(rawName);
    if (nameError) {
        return res.status(400).json({ error: nameError, code: 'VALIDATION' });
    }
    const teamId = rawTeamId.trim().toLowerCase();
    const name = normalizeTeamName(rawName);
    const existing = await teamsRepo.getTeam(teamId);
    if (existing) {
        return res.status(409).json({ error: 'Team already exists', code: 'CONFLICT' });
    }
    const team = await teamsRepo.createTeam({
        teamId,
        name,
        createdAt: new Date().toISOString(),
    });
    res.status(201).json(team);
});
router.get('/:id/delete-preview', authMiddleware, requireRole('admin', 'manager'), async (req, res) => {
    try {
        const preview = await getTeamDeletePreview(routeParam(req.params.id));
        res.json(preview);
    }
    catch (err) {
        if (handleLifecycleError(err, res))
            return;
        throw err;
    }
});
router.patch('/:id', authMiddleware, requireRole('admin', 'manager'), async (req, res) => {
    const teamId = routeParam(req.params.id);
    const nameError = validateTeamName(req.body?.name);
    if (nameError) {
        return res.status(400).json({ error: nameError, code: 'VALIDATION' });
    }
    const name = normalizeTeamName(req.body.name);
    const updated = await teamsRepo.updateTeam(teamId, { name });
    if (!updated)
        return res.status(404).json({ error: 'Not found', code: 'NOT_FOUND' });
    await syncTeamDisplayName(teamId, name);
    res.json(updated);
});
router.delete('/:id', authMiddleware, requireRole('admin', 'manager'), async (req, res) => {
    try {
        await deleteTeamAndDependencies(routeParam(req.params.id));
        res.status(204).send();
    }
    catch (err) {
        if (handleLifecycleError(err, res))
            return;
        throw err;
    }
});
export default router;
