# Infrastructure

**Deployed region:** `eu-north-1`  
**Public URL:** [https://d2nnx11y19xl0z.cloudfront.net](https://d2nnx11y19xl0z.cloudfront.net)

| Doc | Purpose |
|-----|---------|
| [AWS-DEPLOYMENT.md](./AWS-DEPLOYMENT.md) | Phased deploy checklist (mark steps done) |
| [VPC-PRIVATE-EC2-MIGRATION.md](./VPC-PRIVATE-EC2-MIGRATION.md) | Private EC2 + NAT runbook (completed for this project) |
| [cloudwatch-dashboard.json](./cloudwatch-dashboard.json) | Dashboard `MiniJira` widget definitions |
| [../README.md](../README.md) | Production frontend/backend deploy (EC2 + SSM) |

## Core (deployed)

| Resource | Name / ID |
|----------|-----------|
| VPC | `mini-jira-vpc` (`vpc-0839ece58c89264ca`) |
| ALB | `mini-jira-alb-1713441418.eu-north-1.elb.amazonaws.com` |
| ASG | `mini-jira-asg` (min 2, 2 AZ) |
| Launch template | `asg-template` v5 — no public IP, AMI `ami-02699a43588da773b` |
| CloudFront | `E19LM6JGGQ56CX` |
| Cognito pool | `eu-north-1_0DPcA2AgE` |
| Cognito client | `282sshpei1b1ujuar9a3svofq3` |

- **VPC:** public subnets (ALB, NAT), private subnets (EC2), NAT outbound
- **IAM:** EC2 `mini-jira-ec2-role` (DynamoDB, S3, SNS, CloudWatch, SSM); Lambda execution roles per function

## Storage & images

- S3 originals + resized buckets
- Lambda `mini-jira-image-resize` on S3 PUT

## Events

| Resource | Name |
|----------|------|
| SNS assignments | `mini-jira-task-assignments` |
| SNS digest | `mini-jira-daily-digest` |
| SNS alarms | `mini-jira-alarms` |
| SQS | subscribed to assignment topic |
| Worker Lambda | `mini-jira-assignment-worker` |
| EventBridge | `mini-jira-daily-digest-9am` — `cron(0 9 * * ? *)` |
| Digest Lambda | `mini-jira-daily-digest` |

## Monitoring

- **Namespace:** `MiniJira`
- **Metrics:** `TasksCreated`, `TasksClosed`, `TasksAssignedPerTeam`, `TimeToCloseHours` (dimension `TeamId`)
- **Dashboard:** `MiniJira` — tasks created/closed per team, avg `TimeToCloseHours`, EC2 CPU by `AutoScalingGroupName` `mini-jira-asg`
- **Alarm:** `mini-jira-tasks-created-activity` → SNS `mini-jira-alarms`

Apply dashboard:

```bash
aws cloudwatch put-dashboard --region eu-north-1 \
  --dashboard-name MiniJira \
  --dashboard-body file://infrastructure/cloudwatch-dashboard.json
```

## EC2 environment (reference)

```bash
AWS_REGION=eu-north-1
TABLE_PREFIX=mini-jira-
DEV_AUTH=false
COGNITO_USER_POOL_ID=eu-north-1_0DPcA2AgE
COGNITO_CLIENT_ID=282sshpei1b1ujuar9a3svofq3
S3_ORIGINALS_BUCKET=...
S3_RESIZED_BUCKET=...
EVENTS_ENABLED=true
SNS_ASSIGNMENT_TOPIC_ARN=...
```

## Build on EC2

```bash
cd backend && npm ci && npm run build
pm2 restart mini-jira-api
```

Frontend: build on EC2 with production `frontend/.env` — see [Deploy frontend](../README.md#production-operations) in root README (do not rsync laptop `dist/`).
