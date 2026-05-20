import { CloudWatchClient, PutMetricDataCommand } from '@aws-sdk/client-cloudwatch';
import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient, PutCommand } from '@aws-sdk/lib-dynamodb';
import { ulid } from 'ulid';

const ddb = DynamoDBDocumentClient.from(new DynamoDBClient({}));
const cw = new CloudWatchClient({});
const ACTIVITY_TABLE = process.env.ACTIVITY_TABLE;
const NAMESPACE = process.env.CLOUDWATCH_NAMESPACE ?? 'MiniJira';

export const handler = async (event) => {
  for (const record of event.Records ?? []) {
    let payload;
    try {
      const body = JSON.parse(record.body);
      let inner = typeof body.Message === 'string' ? JSON.parse(body.Message) : body;
      // SNS MessageStructure json: { default: "<payload json>", email: "..." }
      if (inner?.default) {
        inner =
          typeof inner.default === 'string' ? JSON.parse(inner.default) : inner.default;
      }
      payload = inner;
    } catch {
      continue;
    }

    const { taskId, assigneeId, teamId, title } = payload ?? {};
    if (!taskId || !assigneeId || !teamId) continue;
    const now = new Date();
    const date = now.toISOString().split('T')[0];

    await ddb.send(
      new PutCommand({
        TableName: ACTIVITY_TABLE,
        Item: {
          date,
          logKey: `${now.toISOString()}#${ulid()}`,
          type: 'TASK_ASSIGNED',
          taskId,
          assigneeId,
          teamId,
          payload: { title },
          createdAt: now.toISOString(),
        },
      })
    );

    await cw.send(
      new PutMetricDataCommand({
        Namespace: NAMESPACE,
        MetricData: [
          {
            MetricName: 'TasksAssignedPerTeam',
            Value: 1,
            Unit: 'Count',
            Dimensions: [{ Name: 'TeamId', Value: teamId }],
          },
        ],
      })
    );
  }
  return { statusCode: 200 };
};
