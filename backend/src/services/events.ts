import { PublishCommand, SNSClient } from '@aws-sdk/client-sns';
import { config } from '../config.js';

const sns = new SNSClient({ region: config.awsRegion });

function assignmentEmailBody(event: {
  taskId: string;
  assigneeId: string;
  teamId: string;
  title: string;
  assigneeEmail?: string;
}): string {
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

export async function publishTaskAssignment(event: {
  taskId: string;
  assigneeId: string;
  teamId: string;
  title: string;
  assigneeEmail?: string;
}) {
  if (!config.eventsEnabled || !config.snsAssignmentTopicArn) return;

  await sns.send(
    new PublishCommand({
      TopicArn: config.snsAssignmentTopicArn,
      Message: assignmentEmailBody(event),
      Subject: `Task assigned: ${event.title}`,
    })
  );
}
