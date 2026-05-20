# Mini-Jira — AWS deployment checklist

**Status:** Deployed in **`eu-north-1`** (account `452031276830`).  
**Submission URL:** [https://d2nnx11y19xl0z.cloudfront.net](https://d2nnx11y19xl0z.cloudfront.net)  
**Deadline:** 22 May 2026, 11:59 PM — **stop** instances when idle; **do not terminate** graded resources.

| Doc | Use |
|-----|-----|
| [../README.md](../README.md) | Entry point, demo users, **production deploy** (EC2 + SSM) |
| [README.md](./README.md) | Deployed resource names |
| [../docs/ARCHITECTURE.md](../docs/ARCHITECTURE.md) | Topology + monitoring |
| [VPC-PRIVATE-EC2-MIGRATION.md](./VPC-PRIVATE-EC2-MIGRATION.md) | Private EC2 + NAT (done) |
| [../docs/COURSE-REQUIREMENTS.md](../docs/COURSE-REQUIREMENTS.md) | Course PDF requirements |

---

## Phase 0 — Account & IAM

| Step | Action | Status |
|------|--------|--------|
| 1 | MFA on root; daily ops via IAM admin (not root) | Done |
| 2 | Region **`eu-north-1`** documented | Done |
| 3 | Billing alarm | Done (verify threshold) |
| 4 | Admin IAM user + MFA | Done |
| 5 | Teammate IAM users (ReadOnly / limited PowerUser) | Per team |
| 6 | Shared doc for ARNs — **no secrets in Git** | Ongoing |

---

## Phase 1 — Data & auth

| Step | Action | Status |
|------|--------|--------|
| 7 | DynamoDB tables (`npm run create-tables`), optional seed | Done |
| 8 | Cognito pool `eu-north-1_0DPcA2AgE`, client `282sshpei1b1ujuar9a3svofq3`, `custom:role` / `custom:teamId`, demo users | Done |
| 9 | Production env: `DEV_AUTH=false`, frontend `VITE_DEV_MOCK_LOGIN=false`, Cognito redirect = CloudFront URL | Done |

---

## Phase 2 — Storage & events

| Step | Action | Status |
|------|--------|--------|
| 10 | S3 originals + resized buckets | Done |
| 11 | SNS `mini-jira-task-assignments` + email subscription | Done |
| 12 | SQS subscribed to SNS | Done |
| 13 | Lambdas: `mini-jira-image-resize`, `mini-jira-assignment-worker`, `mini-jira-daily-digest` | Done |

---

## Phase 3 — Network & compute

| Step | Action | Status |
|------|--------|--------|
| 14 | VPC `mini-jira-vpc`: 2 **public** (ALB + NAT), 2 **private** (EC2), NAT outbound — [VPC-PRIVATE-EC2-MIGRATION.md](./VPC-PRIVATE-EC2-MIGRATION.md) | **Done** |
| 15 | SG: ALB 80/443 from internet; EC2 app port only from ALB SG | Done |
| 16 | EC2 AMI + launch template `asg-template` v5 (no public IP, pm2, IAM profile) | Done |
| 17 | Target group health `/health` | Done |
| 18 | ALB `mini-jira-alb-1713441418.eu-north-1.elb.amazonaws.com` | Done |
| 19 | ASG `mini-jira-asg` min **2**, **2 AZ** | Done |
| 20 | Frontend built on EC2 → nginx `/var/www/mini-jira/` | Done |
| 21 | CloudFront `E19LM6JGGQ56CX` → ALB | Done |

> **Historical note:** Early setups sometimes placed EC2 in public subnets only. Production uses **private EC2 + NAT** as required by the course VPC row.

---

## Phase 4 — Wire app to AWS

| Step | Action | Status |
|------|--------|--------|
| 22 | EC2 env: no `DYNAMODB_ENDPOINT`; real Cognito/S3/SNS; `EVENTS_ENABLED=true` | Done |
| 23 | Frontend `.env` on EC2: CloudFront URLs, mock login off | Done |
| 24 | Instance profile `mini-jira-ec2-role` (DynamoDB, S3, SNS, CloudWatch, SSM) | Done |
| 25 | E2E: Cognito login, Ali/Sara/Omar demo, assign → SNS/SQS, image → resize, Done → metrics | Done |

---

## Phase 5 — Monitoring & deliverables

| Step | Action | Status |
|------|--------|--------|
| 26 | Dashboard `MiniJira` — [cloudwatch-dashboard.json](./cloudwatch-dashboard.json) (`TimeToCloseHours`, ASG CPU) | Done |
| 27 | Alarm `mini-jira-tasks-created-activity` → SNS `mini-jira-alarms` | Done |
| 28 | Architecture diagram with **AWS icons** in repo | **TODO** — [../docs/ARCHITECTURE-DIAGRAM.md](../docs/ARCHITECTURE-DIAGRAM.md) |
| 29 | README + public URL | Done |
| 30 | Demo video + Google Form | **TODO** (you) |

---

## Production deploy (quick reference)

Details in [../README.md#production-operations](../README.md#production-operations).

1. **Frontend:** SSM to EC2 → `git pull` → build with prod `frontend/.env` → `rsync` to `/var/www/mini-jira/` → CloudFront invalidation `E19LM6JGGQ56CX` `/*`
2. **Backend:** both instances → `git pull` → `cd backend && npm ci && npm run build` → `pm2 restart mini-jira-api`
3. **Never** rsync Mac `frontend/dist/` with dev mock login enabled

---

## Minimum viable order (reference)

For a fresh build: Phase 0 → 7–8 → 16–18 → 21 → 10–13 → 19, 14, 26–27 → 28–30.

---

## Team access

| Who | Access |
|-----|--------|
| Lead | IAM admin + MFA |
| Most teammates | `ReadOnlyAccess` |
| Optional helpers | `PowerUserAccess` during deploy windows |
| Nobody | Root for daily ops, secrets in GitHub |

---

## Local vs AWS

| | Local | AWS |
|---|--------|-----|
| Database | DynamoDB Local | AWS DynamoDB |
| Auth | `DEV_AUTH=true`, mock login | Cognito |
| Metrics | May warn without creds | EC2/Lambda IAM |
| Events | `EVENTS_ENABLED=false` | `true` + SNS ARN |
