export type UserRole = 'manager' | 'employee' | 'admin';
export type TaskStatus = 'todo' | 'in_progress' | 'in_review' | 'done';
export type TaskPriority = 'low' | 'medium' | 'high' | 'critical';

export interface User {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  teamId: string;
  teamName: string;
  /** True after Cognito sign-up until name + team are saved */
  needsOnboarding?: boolean;
}

export interface TeamOption {
  teamId: string;
  name: string;
}

export interface Task {
  id: string;
  title: string;
  description: string;
  status: TaskStatus;
  priority: TaskPriority;
  deadline: string;
  assigneeId: string;
  assigneeName: string;
  teamId: string;
  teamName: string;
  projectId?: string;
  imageUrl?: string;
  createdAt: string;
  comments: number;
}

export interface Comment {
  taskId: string;
  commentId: string;
  authorId: string;
  authorName: string;
  body: string;
  createdAt: string;
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

export interface Team {
  teamId: string;
  name: string;
  createdAt: string;
}

/** DynamoDB user row (from /api/users for managers). */
export interface UserProfile {
  userId: string;
  email: string;
  name?: string;
  role: UserRole;
  teamId?: string;
  createdAt?: string;
  onboardingComplete?: boolean;
}

export interface AuditEntry {
  taskId: string;
  auditKey: string;
  fromStatus: TaskStatus;
  toStatus: TaskStatus;
  changedBy: string;
  changedByName: string;
  changedAt: string;
}

export interface AnalyticsSummary {
  totalTasks: number;
  byStatus: Record<TaskStatus, number>;
  byTeam: Record<string, Record<TaskStatus, number>>;
  overdue: number;
  createdPerDay: Record<string, number>;
  closedPerTeam: Record<string, number>;
}
