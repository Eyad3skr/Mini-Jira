import type { Task } from '../types.js';
export interface TaskResponse {
    id: string;
    title: string;
    description: string;
    status: Task['status'];
    priority: Task['priority'];
    deadline: string;
    assigneeId: string;
    assigneeName: string;
    teamId: string;
    teamName: string;
    projectId: string;
    imageUrl?: string;
    createdAt: string;
    comments: number;
}
export declare function toTaskResponse(task: Task): Promise<TaskResponse>;
export declare function toTaskResponses(tasks: Task[]): Promise<TaskResponse[]>;
