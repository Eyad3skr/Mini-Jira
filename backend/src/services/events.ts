import { PublishCommand, SNSClient } from '@aws-sdk/client-sns';
import { config } from '../config.js';

const sns = new SNSClient({ region: config.awsRegion });

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
      Message: JSON.stringify(event),
      Subject: `Task assigned: ${event.title}`,
    })
  );
}
