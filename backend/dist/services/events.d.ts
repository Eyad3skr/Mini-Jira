export declare function publishTaskAssignment(event: {
    taskId: string;
    assigneeId: string;
    teamId: string;
    title: string;
    assigneeEmail?: string;
}): Promise<void>;
