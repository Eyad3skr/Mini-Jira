import {
  CreateTableCommand,
  DescribeTableCommand,
  DynamoDBClient,
  ResourceInUseException,
} from '@aws-sdk/client-dynamodb';
import 'dotenv/config';

const prefix = process.env.TABLE_PREFIX ?? 'mini-jira-';
const endpoint = process.env.DYNAMODB_ENDPOINT;
const region = process.env.AWS_REGION ?? 'us-east-1';

const client = new DynamoDBClient({
  region,
  ...(endpoint && {
    endpoint,
    credentials: { accessKeyId: 'local', secretAccessKey: 'local' },
  }),
});

const tables = [
  {
    TableName: `${prefix}Teams`,
    KeySchema: [{ AttributeName: 'teamId', KeyType: 'HASH' as const }],
    AttributeDefinitions: [{ AttributeName: 'teamId', AttributeType: 'S' as const }],
  },
  {
    TableName: `${prefix}Users`,
    KeySchema: [{ AttributeName: 'userId', KeyType: 'HASH' as const }],
    AttributeDefinitions: [
      { AttributeName: 'userId', AttributeType: 'S' as const },
      { AttributeName: 'teamId', AttributeType: 'S' as const },
      { AttributeName: 'name', AttributeType: 'S' as const },
    ],
    GlobalSecondaryIndexes: [
      {
        IndexName: 'TeamIndex',
        KeySchema: [
          { AttributeName: 'teamId', KeyType: 'HASH' as const },
          { AttributeName: 'name', KeyType: 'RANGE' as const },
        ],
        Projection: { ProjectionType: 'ALL' as const },
      },
    ],
  },
  {
    TableName: `${prefix}Projects`,
    KeySchema: [{ AttributeName: 'projectId', KeyType: 'HASH' as const }],
    AttributeDefinitions: [
      { AttributeName: 'projectId', AttributeType: 'S' as const },
      { AttributeName: 'teamId', AttributeType: 'S' as const },
      { AttributeName: 'createdAt', AttributeType: 'S' as const },
    ],
    GlobalSecondaryIndexes: [
      {
        IndexName: 'TeamIndex',
        KeySchema: [
          { AttributeName: 'teamId', KeyType: 'HASH' as const },
          { AttributeName: 'createdAt', KeyType: 'RANGE' as const },
        ],
        Projection: { ProjectionType: 'ALL' as const },
      },
    ],
  },
  {
    TableName: `${prefix}Tasks`,
    KeySchema: [{ AttributeName: 'taskId', KeyType: 'HASH' as const }],
    AttributeDefinitions: [
      { AttributeName: 'taskId', AttributeType: 'S' as const },
      { AttributeName: 'teamId', AttributeType: 'S' as const },
      { AttributeName: 'createdAt', AttributeType: 'S' as const },
      { AttributeName: 'assigneeId', AttributeType: 'S' as const },
      { AttributeName: 'deadline', AttributeType: 'S' as const },
    ],
    GlobalSecondaryIndexes: [
      {
        IndexName: 'TeamIndex',
        KeySchema: [
          { AttributeName: 'teamId', KeyType: 'HASH' as const },
          { AttributeName: 'createdAt', KeyType: 'RANGE' as const },
        ],
        Projection: { ProjectionType: 'ALL' as const },
      },
      {
        IndexName: 'AssigneeIndex',
        KeySchema: [
          { AttributeName: 'assigneeId', KeyType: 'HASH' as const },
          { AttributeName: 'deadline', KeyType: 'RANGE' as const },
        ],
        Projection: { ProjectionType: 'ALL' as const },
      },
    ],
  },
  {
    TableName: `${prefix}Comments`,
    KeySchema: [
      { AttributeName: 'taskId', KeyType: 'HASH' as const },
      { AttributeName: 'commentId', KeyType: 'RANGE' as const },
    ],
    AttributeDefinitions: [
      { AttributeName: 'taskId', AttributeType: 'S' as const },
      { AttributeName: 'commentId', AttributeType: 'S' as const },
    ],
  },
  {
    TableName: `${prefix}TaskStatusAudit`,
    KeySchema: [
      { AttributeName: 'taskId', KeyType: 'HASH' as const },
      { AttributeName: 'auditKey', KeyType: 'RANGE' as const },
    ],
    AttributeDefinitions: [
      { AttributeName: 'taskId', AttributeType: 'S' as const },
      { AttributeName: 'auditKey', AttributeType: 'S' as const },
    ],
  },
  {
    TableName: `${prefix}ActivityLog`,
    KeySchema: [
      { AttributeName: 'date', KeyType: 'HASH' as const },
      { AttributeName: 'logKey', KeyType: 'RANGE' as const },
    ],
    AttributeDefinitions: [
      { AttributeName: 'date', AttributeType: 'S' as const },
      { AttributeName: 'logKey', AttributeType: 'S' as const },
    ],
  },
];

async function tableExists(name: string): Promise<boolean> {
  try {
    await client.send(new DescribeTableCommand({ TableName: name }));
    return true;
  } catch {
    return false;
  }
}

async function main() {
  for (const def of tables) {
    if (await tableExists(def.TableName)) {
      console.log(`Table ${def.TableName} already exists`);
      continue;
    }
    try {
      await client.send(
        new CreateTableCommand({
          ...def,
          BillingMode: 'PAY_PER_REQUEST',
        })
      );
      console.log(`Created table ${def.TableName}`);
    } catch (err) {
      if (err instanceof ResourceInUseException) {
        console.log(`Table ${def.TableName} already exists`);
      } else {
        throw err;
      }
    }
  }
  console.log('Done.');
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
