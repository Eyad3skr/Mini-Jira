import cors from 'cors';
import express from 'express';
import { config } from './config.js';
import authRoutes from './routes/auth.js';
import analyticsRoutes from './routes/analytics.js';
import meRoutes from './routes/me.js';
import projectsRoutes from './routes/projects.js';
import tasksRoutes from './routes/tasks.js';
import teamsRoutes from './routes/teams.js';
import usersRoutes from './routes/users.js';
const app = express();
app.use(cors());
app.use(express.json());
app.get('/health', (_req, res) => {
    res.json({ status: 'ok', timestamp: new Date().toISOString() });
});
app.use('/api/auth', authRoutes);
app.use('/api/me', meRoutes);
app.use('/api/tasks', tasksRoutes);
app.use('/api/projects', projectsRoutes);
app.use('/api/teams', teamsRoutes);
app.use('/api/users', usersRoutes);
app.use('/api/analytics', analyticsRoutes);
app.use((err, _req, res, _next) => {
    console.error(err);
    res.status(500).json({ error: 'Internal server error', code: 'INTERNAL' });
});
app.listen(config.port, () => {
    console.log(`Mini-Jira API listening on port ${config.port}`);
    console.log(`DEV_AUTH: ${config.devAuth}`);
});
