import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient, ScanCommand } from '@aws-sdk/lib-dynamodb';
import { PublishCommand, SNSClient } from '@aws-sdk/client-sns';

const ddb = DynamoDBDocumentClient.from(new DynamoDBClient({}));
const sns = new SNSClient({});
const TASKS_TABLE = process.env.TASKS_TABLE;
const DIGEST_TOPIC_ARN = process.env.DIGEST_TOPIC_ARN;

export const handler = async () => {
  const today = new Date().toISOString().split('T')[0];
  const result = await ddb.send(new ScanCommand({ TableName: TASKS_TABLE }));
  const tasks = (result.Items ?? []).filter((t) => t.deadline === today && t.status !== 'done');

  const byAssignee = {};
  for (const task of tasks) {
    if (!byAssignee[task.assigneeId]) byAssignee[task.assigneeId] = [];
    byAssignee[task.assigneeId].push(task);
  }

  for (const [assigneeId, assigneeTasks] of Object.entries(byAssignee)) {
    const lines = assigneeTasks.map((t) => `- ${t.title} (${t.teamName})`).join('\n');
    await sns.send(
      new PublishCommand({
        TopicArn: DIGEST_TOPIC_ARN,
        Subject: `Daily task digest - ${today}`,
        Message: `You have ${assigneeTasks.length} task(s) due today:\n\n${lines}`,
      })
    );
  }

  return { statusCode: 200, processed: tasks.length };
};
