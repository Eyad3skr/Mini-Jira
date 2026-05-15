import { CognitoJwtVerifier } from 'aws-jwt-verify';
import type { NextFunction, Request, Response } from 'express';
import { config } from '../config.js';
import type { AuthUser, UserRole } from '../types.js';
import * as usersRepo from '../db/repositories/users.js';

export interface AuthenticatedRequest extends Request {
  user: AuthUser;
}

const DEV_USERS: Record<string, AuthUser> = {
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

let verifier: ReturnType<typeof CognitoJwtVerifier.create> | null = null;

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

export async function authMiddleware(req: Request, res: Response, next: NextFunction) {
  const authHeader = req.headers.authorization;
  if (!authHeader?.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Missing authorization token', code: 'UNAUTHORIZED' });
  }

  const token = authHeader.slice(7);

  try {
    let authUser: AuthUser;

    if (config.devAuth && DEV_USERS[token]) {
      authUser = DEV_USERS[token];
    } else if (config.devAuth && token.startsWith('dev:')) {
      const userId = token.slice(4);
      if (!DEV_USERS[userId]) {
        return res.status(401).json({ error: 'Invalid dev token', code: 'UNAUTHORIZED' });
      }
      authUser = DEV_USERS[userId];
    } else {
      const v = getVerifier();
      if (!v) {
        return res.status(500).json({ error: 'Cognito not configured', code: 'AUTH_CONFIG' });
      }
      const payload = await v.verify(token);
      const profile = await usersRepo.getUser(payload.sub);
      authUser = {
        sub: payload.sub,
        email: (payload.email as string) ?? profile?.email ?? '',
        name: (payload.name as string) ?? profile?.name ?? '',
        role: ((payload['custom:role'] as string) ?? profile?.role ?? 'employee') as UserRole,
        teamId: (payload['custom:teamId'] as string) ?? profile?.teamId ?? '',
      };
    }

    (req as AuthenticatedRequest).user = authUser;
    next();
  } catch {
    return res.status(401).json({ error: 'Invalid token', code: 'UNAUTHORIZED' });
  }
}

export function requireRole(...roles: UserRole[]) {
  return (req: Request, res: Response, next: NextFunction) => {
    const user = (req as AuthenticatedRequest).user;
    if (!roles.includes(user.role)) {
      return res.status(403).json({ error: 'Forbidden', code: 'FORBIDDEN' });
    }
    next();
  };
}
