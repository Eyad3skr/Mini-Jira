import 'dotenv/config';
export declare const config: {
    readonly port: number;
    readonly nodeEnv: string;
    readonly awsRegion: string;
    readonly dynamodbEndpoint: string | undefined;
    readonly tablePrefix: string;
    readonly tables: {
        readonly teams: `${string}Teams`;
        readonly users: `${string}Users`;
        readonly projects: `${string}Projects`;
        readonly tasks: `${string}Tasks`;
        readonly comments: `${string}Comments`;
        readonly taskStatusAudit: `${string}TaskStatusAudit`;
        readonly activityLog: `${string}ActivityLog`;
    };
    readonly devAuth: boolean;
    readonly cognito: {
        readonly userPoolId: string;
        readonly clientId: string;
    };
    readonly s3: {
        readonly originalsBucket: string;
        readonly resizedBucket: string;
        readonly publicUrl: string;
    };
    readonly eventsEnabled: boolean;
    readonly snsAssignmentTopicArn: string;
    readonly cloudwatchNamespace: string;
};
