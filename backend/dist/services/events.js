import { PublishCommand, SNSClient } from '@aws-sdk/client-sns';
import { config } from '../config.js';
import { ensureAssigneeEmailSubscription } from './snsAssignee.js';
const sns = new SNSClient({ region: config.awsRegion });
function assignmentEmailBody(event) {
    const lines = [
        'You have been assigned a new task in Mini-Jira.',
        '',
        `Title: ${event.title}`,
        `Task ID: ${event.taskId}`,
        `Team: ${event.teamId}`,
    ];
    if (event.assigneeEmail) {
        lines.push(`Assignee: ${event.assigneeEmail}`);
    }
    return lines.join('\n');
}
export async function publishTaskAssignment(event) {
    if (!config.eventsEnabled || !config.snsAssignmentTopicArn)
        return;
    if (event.assigneeEmail) {
        await ensureAssigneeEmailSubscription(event.assigneeId, event.assigneeEmail);
    }
    const payload = {
        taskId: event.taskId,
        assigneeId: event.assigneeId,
        teamId: event.teamId,
        title: event.title,
        assigneeEmail: event.assigneeEmail,
    };
    await sns.send(new PublishCommand({
        TopicArn: config.snsAssignmentTopicArn,
        Subject: `Task assigned: ${event.title}`,
        Message: JSON.stringify({
            default: JSON.stringify(payload),
            email: assignmentEmailBody(event),
        }),
        MessageStructure: 'json',
        MessageAttributes: {
            assigneeId: {
                DataType: 'String',
                StringValue: event.assigneeId,
            },
        },
    }));
}
