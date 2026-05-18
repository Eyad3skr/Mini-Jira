import { CognitoJwtVerifier } from 'aws-jwt-verify';
import { config } from '../config.js';
import { ensureUserProfile } from '../services/userProvisioning.js';
const DEV_USERS = {
    'user-ali': {
        sub: 'user-ali',
        email: 'ali@company.com',
        name: 'Ali Hassan',
        role: 'manager',
        teamId: 'all',
    },
    'user-sara': {
        sub: 'user-sara',
        email: 'sara@company.com',
        name: 'Sara Ahmed',
        role: 'employee',
        teamId: 'frontend',
    },
    'user-omar': {
        sub: 'user-omar',
        email: 'omar@company.com',
        name: 'Omar Khaled',
        role: 'employee',
        teamId: 'backend',
    },
};
let verifier = null;
function getVerifier() {
    if (!verifier && config.cognito.userPoolId && config.cognito.clientId) {
        verifier = CognitoJwtVerifier.create({
            userPoolId: config.cognito.userPoolId,
            tokenUse: 'access',
            clientId: config.cognito.clientId,
        });
    }
    return verifier;
}
export async function authMiddleware(req, res, next) {
    const authHeader = req.headers.authorization;
    if (!authHeader?.startsWith('Bearer ')) {
        return res.status(401).json({ error: 'Missing authorization token', code: 'UNAUTHORIZED' });
    }
    const token = authHeader.slice(7);
    try {
        let authUser;
        if (config.devAuth && DEV_USERS[token]) {
            authUser = DEV_USERS[token];
        }
        else if (config.devAuth && token.startsWith('dev:')) {
            const userId = token.slice(4);
            if (!DEV_USERS[userId]) {
                return res.status(401).json({ error: 'Invalid dev token', code: 'UNAUTHORIZED' });
            }
            authUser = DEV_USERS[userId];
        }
        else {
            const v = getVerifier();
            if (!v) {
                return res.status(500).json({ error: 'Cognito not configured', code: 'AUTH_CONFIG' });
            }
            const payload = await v.verify(token);
            const profile = await ensureUserProfile(payload.sub, {
                email: payload.email,
                name: payload.name ?? payload['cognito:username'],
            });
            authUser = {
                sub: profile.userId,
                email: profile.email,
                name: profile.name,
                role: (payload['custom:role'] ?? profile.role),
                teamId: payload['custom:teamId'] ?? profile.teamId,
            };
        }
        req.user = authUser;
        next();
    }
    catch (err) {
        if (config.nodeEnv === 'development') {
            console.error('[auth] Token verification failed:', err);
        }
        const detail = config.nodeEnv === 'development' && err instanceof Error ? err.message : undefined;
        return res.status(401).json({
            error: detail ?? 'Invalid token',
            code: 'UNAUTHORIZED',
        });
    }
}
export function requireRole(...roles) {
    return (req, res, next) => {
        const user = req.user;
        if (!roles.includes(user.role)) {
            return res.status(403).json({ error: 'Forbidden', code: 'FORBIDDEN' });
        }
        next();
    };
}
