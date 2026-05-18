export function canAccessTeam(user, teamId) {
    if (user.role === 'manager' || user.role === 'admin')
        return true;
    return user.teamId === teamId;
}
export function assertTaskAccess(user, task, res) {
    if (!canAccessTeam(user, task.teamId)) {
        res.status(403).json({ error: 'Task not accessible for your team', code: 'TEAM_FORBIDDEN' });
        return false;
    }
    return true;
}
export function canUpdateTaskStatus(user, task) {
    if (user.role === 'manager' || user.role === 'admin')
        return true;
    return task.assigneeId === user.sub;
}
