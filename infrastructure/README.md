# Infrastructure

**Manual deployment checklist (step-by-step):** [AWS-DEPLOYMENT.md](./AWS-DEPLOYMENT.md)

Deploy AWS resources manually or via your preferred IaC tool. Required components:

## Core

- **VPC**: public subnets (ALB), private subnets (EC2), NAT gateway
- **ALB** + target group → EC2 ASG (min 2 instances, 2 AZs)
- **CloudFront** → ALB origin
- **Cognito** user pool + app client
- **DynamoDB** tables (see `backend/scripts/create-tables.ts`)
- **IAM** roles: EC2 instance profile, Lambda execution roles

## Storage & Images

- S3 bucket `mini-jira-originals` (task uploads)
- S3 bucket `mini-jira-resized` (Lambda output)
- Lambda `image-resize` on S3 PUT events (`backend/lambdas/image-resize`)

## Events

- SNS topic for task assignments
- SQS queue subscribed to SNS
- Lambda `assignment-worker` triggered by SQS (`backend/lambdas/assignment-worker`)
- EventBridge rule `cron(0 9 * * ? *)` → Lambda `daily-digest`

## Monitoring

- CloudWatch custom namespace `MiniJira`
- Dashboard: tasks created/closed, time-to-close, EC2 CPU
- Alarm: overdue tasks threshold → SNS

## EC2 Environment Variables

```
AWS_REGION=us-east-1
TABLE_PREFIX=mini-jira-
DEV_AUTH=false
COGNITO_USER_POOL_ID=...
COGNITO_CLIENT_ID=...
S3_ORIGINALS_BUCKET=...
S3_RESIZED_BUCKET=...
EVENTS_ENABLED=true
SNS_ASSIGNMENT_TOPIC_ARN=...
```

## Build & Run on EC2

```bash
cd backend && npm ci && npm run build
pm2 start dist/index.js --name mini-jira-api
```

Serve frontend static build from same instance or S3+CloudFront for static assets.
