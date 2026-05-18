import type { Response } from 'express';
import type { AuthenticatedRequest } from './auth.js';
import type { Task } from '../types.js';
export declare function canAccessTeam(user: AuthenticatedRequest['user'], teamId: string): boolean;
export declare function assertTaskAccess(user: AuthenticatedRequest['user'], task: Task, res: Response): boolean;
export declare function canUpdateTaskStatus(user: AuthenticatedRequest['user'], task: Task): boolean;
