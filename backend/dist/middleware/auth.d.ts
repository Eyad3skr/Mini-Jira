import type { NextFunction, Request, Response } from 'express';
import type { AuthUser, UserRole } from '../types.js';
export interface AuthenticatedRequest extends Request {
    user: AuthUser;
}
export declare function authMiddleware(req: Request, res: Response, next: NextFunction): Promise<Response<any, Record<string, any>> | undefined>;
export declare function requireRole(...roles: UserRole[]): (req: Request, res: Response, next: NextFunction) => Response<any, Record<string, any>> | undefined;
