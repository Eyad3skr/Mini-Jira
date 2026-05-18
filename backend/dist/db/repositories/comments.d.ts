import type { Comment } from '../../types.js';
export declare function listComments(taskId: string): Promise<Comment[]>;
export declare function createComment(comment: Comment): Promise<Comment>;
export declare function countComments(taskId: string): Promise<number>;
