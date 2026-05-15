import type { Task } from '../types.js';
import { getImagePublicUrl } from '../services/s3.js';
import * as commentsRepo from '../db/repositories/comments.js';

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

export async function toTaskResponse(task: Task): Promise<TaskResponse> {
  const count = await commentsRepo.countComments(task.taskId);
  const latestImage = task.imageKeys?.length
    ? task.imageKeys[task.imageKeys.length - 1]
    : undefined;
  const imageKey = latestImage?.resizedKey ?? latestImage?.originalKey;

  return {
    id: task.taskId,
    title: task.title,
    description: task.description,
    status: task.status,
    priority: task.priority,
    deadline: task.deadline,
    assigneeId: task.assigneeId,
    assigneeName: task.assigneeName,
    teamId: task.teamId,
    teamName: task.teamName,
    projectId: task.projectId,
    imageUrl: imageKey ? getImagePublicUrl(imageKey) : undefined,
    createdAt: task.createdAt,
    comments: count,
  };
}

export async function toTaskResponses(tasks: Task[]): Promise<TaskResponse[]> {
  return Promise.all(tasks.map(toTaskResponse));
}
