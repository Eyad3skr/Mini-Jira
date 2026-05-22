/** teamId values that cannot be created or deleted as real teams */
export const RESERVED_TEAM_IDS = new Set(['all']);
export const TEAM_ID_PATTERN = /^[a-z0-9][a-z0-9-]{0,31}$/;
export function normalizeTeamName(name) {
    return name.trim().toUpperCase();
}
export function validateTeamId(teamId) {
    const id = teamId.trim().toLowerCase();
    if (!id)
        return 'teamId is required';
    if (!TEAM_ID_PATTERN.test(id)) {
        return 'teamId must be lowercase letters, numbers, and hyphens (2–32 chars)';
    }
    if (RESERVED_TEAM_IDS.has(id))
        return `teamId "${id}" is reserved`;
    return null;
}
export function validateTeamName(name) {
    if (typeof name !== 'string' || !name.trim())
        return 'name is required';
    return null;
}
