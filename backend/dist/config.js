import 'dotenv/config';
const prefix = process.env.TABLE_PREFIX ?? 'mini-jira-';
export const config = {
    port: parseInt(process.env.PORT ?? '3001', 10),
    nodeEnv: process.env.NODE_ENV ?? 'development',
    awsRegion: process.env.AWS_REGION ?? 'us-east-1',
    dynamodbEndpoint: process.env.DYNAMODB_ENDPOINT || undefined,
    tablePrefix: prefix,
    tables: {
        teams: `${prefix}Teams`,
        users: `${prefix}Users`,
        projects: `${prefix}Projects`,
        tasks: `${prefix}Tasks`,
        comments: `${prefix}Comments`,
        taskStatusAudit: `${prefix}TaskStatusAudit`,
        activityLog: `${prefix}ActivityLog`,
    },
    devAuth: process.env.DEV_AUTH === 'true',
    cognito: {
        userPoolId: process.env.COGNITO_USER_POOL_ID ?? '',
        clientId: process.env.COGNITO_CLIENT_ID ?? '',
    },
    s3: {
        originalsBucket: process.env.S3_ORIGINALS_BUCKET ?? 'mini-jira-originals',
        resizedBucket: process.env.S3_RESIZED_BUCKET ?? 'mini-jira-resized',
        publicUrl: process.env.S3_PUBLIC_URL ?? '',
    },
    eventsEnabled: process.env.EVENTS_ENABLED === 'true',
    snsAssignmentTopicArn: process.env.SNS_ASSIGNMENT_TOPIC_ARN ?? '',
    cloudwatchNamespace: process.env.CLOUDWATCH_NAMESPACE ?? 'MiniJira',
};
