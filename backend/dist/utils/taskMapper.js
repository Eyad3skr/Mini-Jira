import { getImagePublicUrl } from '../services/s3.js';
import * as commentsRepo from '../db/repositories/comments.js';
export async function toTaskResponse(task) {
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
export async function toTaskResponses(tasks) {
    return Promise.all(tasks.map(toTaskResponse));
}
