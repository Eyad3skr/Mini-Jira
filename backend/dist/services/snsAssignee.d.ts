/**
 * Subscribe assignee email to the assignment topic (with filter on assigneeId).
 * They must confirm via the AWS "Subscription Confirmation" email once.
 */
export declare function ensureAssigneeEmailSubscription(userId: string, email: string): Promise<void>;
