import type { TaskStatusAuditEntry } from '../../types.js';
export declare function createAuditEntry(entry: TaskStatusAuditEntry): Promise<void>;
export declare function listAuditForTask(taskId: string): Promise<TaskStatusAuditEntry[]>;
export declare function deleteAuditForTask(taskId: string): Promise<void>;
