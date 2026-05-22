import type { Task } from '../../types.js';
export declare function listTasksByTeam(teamId: string): Promise<Task[]>;
export declare function listTasksByAssignee(assigneeId: string): Promise<Task[]>;
export declare function listAllTasks(): Promise<Task[]>;
export declare function getTask(taskId: string): Promise<Task | null>;
export declare function createTask(task: Task): Promise<Task>;
export declare function updateTask(taskId: string, updates: Partial<Task>): Promise<Task | null>;
export declare function deleteTask(taskId: string): Promise<boolean>;
export declare function syncTeamNameForTeam(teamId: string, teamName: string): Promise<void>;
