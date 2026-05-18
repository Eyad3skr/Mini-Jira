import { config } from '../config.js';
import { getImageViewUrl } from '../services/s3.js';
import * as commentsRepo from '../db/repositories/comments.js';
export async function toTaskResponse(task) {
    const count = await commentsRepo.countComments(task.taskId);
    const latestImage = task.imageKeys?.length
        ? task.imageKeys[task.imageKeys.length - 1]
        : undefined;
    const imageKey = latestImage?.resizedKey ?? latestImage?.originalKey;
    const imageBucket = latestImage?.resizedKey
        ? config.s3.resizedBucket
        : config.s3.originalsBucket;
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
        imageUrl: imageKey ? await getImageViewUrl(imageKey, imageBucket) : undefined,
        createdAt: task.createdAt,
        comments: count,
    };
}
export async function toTaskResponses(tasks) {
    return Promise.all(tasks.map(toTaskResponse));
}
