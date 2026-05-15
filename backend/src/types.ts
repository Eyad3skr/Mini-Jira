export type UserRole = 'manager' | 'employee' | 'admin';
export type TaskStatus = 'todo' | 'in_progress' | 'in_review' | 'done';
export type TaskPriority = 'low' | 'medium' | 'high' | 'critical';

export interface AuthUser {
  sub: string;
  email: string;
  name: string;
  role: UserRole;
  teamId: string;
}

export interface Team {
  teamId: string;
  name: string;
  createdAt: string;
}

export interface UserProfile {
  userId: string;
  email: string;
  name: string;
  role: UserRole;
  teamId: string;
  createdAt: string;
  /** Dev-only plaintext password for local login (never use in production). */
  devPassword?: string;
}

export interface Project {
  projectId: string;
  name: string;
  description: string;
  teamId: string;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
}

export interface ImageKey {
  version: number;
  originalKey: string;
  resizedKey?: string;
  uploadedAt: string;
}

export interface Task {
  taskId: string;
  projectId: string;
  title: string;
  description: string;
  status: TaskStatus;
  priority: TaskPriority;
  deadline: string;
  assigneeId: string;
  assigneeName: string;
  teamId: string;
  teamName: string;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
  imageKeys?: ImageKey[];
}

export interface Comment {
  taskId: string;
  commentId: string;
  authorId: string;
  authorName: string;
  body: string;
  createdAt: string;
}

export interface TaskStatusAuditEntry {
  taskId: string;
  auditKey: string;
  fromStatus: TaskStatus;
  toStatus: TaskStatus;
  changedBy: string;
  changedByName: string;
  changedAt: string;
}

export interface ActivityLogEntry {
  date: string;
  logKey: string;
  type: string;
  taskId: string;
  assigneeId: string;
  teamId: string;
  payload: Record<string, unknown>;
  createdAt: string;
}

export const VALID_STATUSES: TaskStatus[] = ['todo', 'in_progress', 'in_review', 'done'];
export const VALID_PRIORITIES: TaskPriority[] = ['low', 'medium', 'high', 'critical'];
