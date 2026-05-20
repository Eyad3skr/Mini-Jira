# AWS deployment

**Environment:** `eu-north-1` (account `452031276830`)  
**Application URL:** [https://d2nnx11y19xl0z.cloudfront.net](https://d2nnx11y19xl0z.cloudfront.net)

| Document | Purpose |
|----------|---------|
| [../README.md](../README.md) | Operations — frontend/backend deploy on EC2 |
| [README.md](./README.md) | Resource names and monitoring |
| [../docs/ARCHITECTURE.md](../docs/ARCHITECTURE.md) | Architecture overview |
| [VPC-PRIVATE-EC2-MIGRATION.md](./VPC-PRIVATE-EC2-MIGRATION.md) | Private EC2 and NAT |

---

## Phase 0 — Account and IAM

| Step | Action |
|------|--------|
| 1 | MFA on root; daily operations via IAM admin |
| 2 | Single region: `eu-north-1` |
| 3 | Billing alarm |
| 4 | Admin IAM user with MFA |
| 5 | Team IAM users (ReadOnly by default) |
| 6 | Operational runbook for ARNs — no secrets in Git |

---

## Phase 1 — Data and authentication

| Step | Action |
|------|--------|
| 7 | DynamoDB tables (`npm run create-tables`), optional seed |
| 8 | Cognito pool `eu-north-1_0DPcA2AgE`, client `282sshpei1b1ujuar9a3svofq3`, attributes `custom:role`, `custom:teamId` |
| 9 | Production: `DEV_AUTH=false`, `VITE_DEV_MOCK_LOGIN=false`, Cognito callbacks = CloudFront URL |

---

## Phase 2 — Storage and events

| Step | Action |
|------|--------|
| 10 | S3 originals and resized buckets |
| 11 | SNS `mini-jira-task-assignments` and email subscriptions |
| 12 | SQS subscribed to SNS |
| 13 | Lambdas: `mini-jira-image-resize`, `mini-jira-assignment-worker`, `mini-jira-daily-digest` |

---

## Phase 3 — Network and compute

| Step | Action |
|------|--------|
| 14 | VPC `mini-jira-vpc`: public subnets (ALB, NAT), private subnets (EC2) — [VPC-PRIVATE-EC2-MIGRATION.md](./VPC-PRIVATE-EC2-MIGRATION.md) |
| 15 | Security groups: ALB 80/443 from internet; EC2 application ports from ALB only |
| 16 | Launch template `asg-template` v5 — no public IP, pm2, IAM instance profile |
| 17 | Target group health check `/health` |
| 18 | ALB `mini-jira-alb-1713441418.eu-north-1.elb.amazonaws.com` |
| 19 | ASG `mini-jira-asg` — minimum 2 instances, 2 AZs |
| 20 | Frontend built on EC2, served from `/var/www/mini-jira/` |
| 21 | CloudFront `E19LM6JGGQ56CX` → ALB |

Production uses **private EC2** with NAT egress (not EC2 in public subnets).

---

## Phase 4 — Application integration

| Step | Action |
|------|--------|
| 22 | EC2 environment: no `DYNAMODB_ENDPOINT`; Cognito, S3, SNS; `EVENTS_ENABLED=true` |
| 23 | Frontend `.env` on EC2 aligned with CloudFront |
| 24 | Instance profile `mini-jira-ec2-role` (DynamoDB, S3, SNS, CloudWatch, SSM) |
| 25 | End-to-end validation: auth, RBAC demo users, assignments, image pipeline, metrics |

---

## Phase 5 — Observability

| Step | Action |
|------|--------|
| 26 | Dashboard `MiniJira` — [cloudwatch-dashboard.json](./cloudwatch-dashboard.json) |
| 27 | Alarm `mini-jira-tasks-created-activity` → SNS `mini-jira-alarms` |
| 28 | Architecture diagram in `docs/` — [ARCHITECTURE-DIAGRAM.md](../docs/ARCHITECTURE-DIAGRAM.md) |

---

## Deploy commands (summary)

See [../README.md](../README.md#production-operations).

1. **Frontend:** SSM → `git pull` → build with production `frontend/.env` → sync to `/var/www/mini-jira/` → CloudFront invalidation `E19LM6JGGQ56CX` on `/*`
2. **Backend:** both instances → `git pull` → `npm ci` + `npm run build` → `pm2 restart mini-jira-api`

---

## Bootstrap order (new environment)

Phase 0 → 7–8 → 16–18 → 21 → 10–13 → 19, 14 → 26–27 → 28

---

## Access model

| Principal | Access |
|-----------|--------|
| Platform lead | IAM admin + MFA |
| Engineers | `ReadOnlyAccess` default |
| Deploy helpers | `PowerUserAccess` when needed |
| — | No root for routine work; no credentials in the repository |

---

## Local vs AWS

| | Local | AWS |
|---|--------|-----|
| Database | DynamoDB Local | DynamoDB |
| Auth | Mock / `DEV_AUTH` | Cognito |
| Metrics | Optional local warnings | IAM on EC2 and Lambda |
| Events | `EVENTS_ENABLED=false` | `true` with SNS ARNs |
