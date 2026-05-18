# Mini-Jira — Manual AWS Deployment (Solo Lead)

One AWS account, you build everything, teammates get **IAM users** (not root). Pick **one region** (e.g. `us-east-1`) and use it everywhere.

**Related:** [README.md](./README.md) (resource list), [../docs/ARCHITECTURE.md](../docs/ARCHITECTURE.md), course brief in [../src/imports/pasted_text/mini-jira-aws-project.md](../src/imports/pasted_text/mini-jira-aws-project.md).

**Deadline (course):** 22 May 2026 — stop instances when idle; do not terminate resources required for grading.

---

## Phase 0 — Account & IAM

| Step | Action |
|------|--------|
| 1 | Use **your** AWS account. Enable **MFA on root** (root only for billing/emergencies). |
| 2 | Pick **one region** (e.g. `us-east-1`). Document it in a shared team doc. |
| 3 | Create a **billing alarm** (e.g. $5–10) on your email. |
| 4 | Create IAM user for yourself (e.g. `ali-admin`): **Attach policies directly** → `AdministratorAccess` → enable **MFA**. Use this for all setup (not root). |
| 5 | Create **teammate IAM users**: most get `ReadOnlyAccess`; 1–2 trusted helpers may get `PowerUserAccess` only if needed. Never share root. |
| 6 | Shared doc: region, ARNs, bucket names, Cognito IDs, CloudFront URL, EC2 env vars. **Never commit secrets** to Git. |

### IAM user permissions (when creating users)

- **You (admin):** Attach policy `AdministratorAccess` directly, or create group `Administrators` with that policy and add yourself to the group.
- **Teammates:** `ReadOnlyAccess` by default.

---

## Phase 1 — Data & auth (no EC2 yet)

| Step | Action |
|------|--------|
| 7 | **DynamoDB** — from laptop with AWS CLI configured as your IAM admin user: |
| | `cd backend` — in `backend/.env` for AWS: **remove** `DYNAMODB_ENDPOINT`, set `AWS_REGION=us-east-1` |
| | `npm run create-tables` then `npm run seed` (optional demo data) |
| | Confirm tables: `mini-jira-Teams`, `Users`, `Projects`, `Tasks`, `Comments`, `TaskStatusAudit`, `ActivityLog` |
| 8 | **Cognito** — user pool + app client; `custom:role`, `custom:teamId`. **No phone verification:** Auto-verified attributes = **email** only; app client OAuth scopes = `openid`, `email`, `profile` (not `phone`); sign-in options = **email** only in console. Create demo users (Ali, Sara, Omar). |
| 9 | **Env (production):** `DEV_AUTH=false`, real Cognito IDs; frontend `VITE_COGNITO_*`, `VITE_DEV_MOCK_LOGIN=false`. Test Cognito against AWS DynamoDB from localhost if possible before EC2. |

---

## Phase 2 — Storage & events

| Step | Action |
|------|--------|
| 10 | **S3** — buckets (globally unique names), e.g. `mini-jira-originals-<suffix>`, `mini-jira-resized-<suffix>`. Block public access; access via IAM. |
| 11 | **SNS** — topic for task assignments; add email subscription and confirm. |
| 12 | **SQS** — queue; subscribe queue to SNS topic. |
| 13 | **Lambdas** (from `backend/lambdas/`): |
| | `image-resize` — trigger: S3 PUT on originals bucket |
| | `assignment-worker` — trigger: SQS |
| | `daily-digest` — trigger: EventBridge `cron(0 9 * * ? *)` |
| | IAM execution role per Lambda (DynamoDB, S3, SNS, logs as needed). Note ARNs for EC2 env. |

---

## Phase 3 — Network & compute

| Step | Action |
|------|--------|
| 14 | **VPC** — default VPC OK for course, or custom: 2 public subnets (ALB), 2 private (EC2) + NAT (or EC2 in public subnets for simplicity — confirm with TA). |
| 15 | **Security groups** — ALB: 80/443 from internet; EC2: app port (3001) **only from ALB SG**. |
| 16 | **EC2** — Amazon Linux 2023, Node 20, clone repo, `cd backend && npm ci && npm run build`, production env file, `pm2 start dist/index.js`, health on `/health`. |
| 17 | **Target group** — health check `/health`. |
| 18 | **ALB** — register instances; test `http://<alb-dns>/health`. |
| 19 | **Auto Scaling Group** — min **2** instances, **2 AZs**. |
| 20 | **Frontend** — `cd frontend && npm run build`; serve `frontend/dist/` via nginx on same EC2 (common course path) or S3 + CloudFront for static. |
| 21 | **CloudFront** — origin ALB; route `/api/*` and `/health` to API; HTTPS. **Submission URL** = distribution domain. |

---

## Phase 4 — Wire app to AWS

| Step | Action |
|------|--------|
| 22 | EC2 env: no `DYNAMODB_ENDPOINT`; real Cognito, S3, `EVENTS_ENABLED=true`, `SNS_ASSIGNMENT_TOPIC_ARN`. See [README.md](./README.md). |
| 23 | Rebuild frontend (`frontend/.env`) with `VITE_API_URL` = CloudFront URL (or same-origin if CloudFront paths proxy to API). |
| 24 | **EC2 instance profile** (IAM role): DynamoDB, S3, SNS publish, CloudWatch `PutMetricData` — do not put personal access keys on the server. |
| 25 | **E2E on CloudFront:** Cognito login; Ali/Sara/Omar demo; assign task → email + SQS/Lambda; mark done → metrics; image upload → S3 → resize Lambda. |

---

## Phase 5 — Monitoring & deliverables

| Step | Action |
|------|--------|
| 26 | **CloudWatch dashboard** — adapt [cloudwatch-dashboard.json](./cloudwatch-dashboard.json); add time-to-close if implemented. |
| 27 | **CloudWatch alarm** — e.g. overdue tasks → SNS. |
| 28 | **Architecture diagram** — AWS icons, 2 AZs; commit to repo per course requirements. |
| 29 | **README** — public CloudFront URL, demo login instructions. |
| 30 | **Demo video** + Google Form submission. **Stop** EC2/ASG when not in use. |

---

## Minimum viable order (if overwhelmed)

1. Phase 0 (account + IAM admin for you)
2. Steps 7–8 (DynamoDB + Cognito)
3. Steps 16–18 (one EC2 + ALB; optional short `DEV_AUTH=true` smoke test, then off)
4. Step 21 (CloudFront URL)
5. Steps 10–13 (S3, Lambdas, SNS/SQS)
6. Steps 19, 26–27 (ASG 2 AZ, CloudWatch)
7. Steps 28–30 (deliverables)

---

## Team access (8 people)

| Who | Access |
|-----|--------|
| You | IAM admin user + MFA |
| Most teammates | `ReadOnlyAccess` |
| 1–2 helpers (optional) | `PowerUserAccess` only during deploy windows |
| Nobody | Root, shared passwords, access keys in GitHub |

---

## Local vs AWS

| | Local | AWS |
|---|--------|-----|
| Database | DynamoDB Local (`DYNAMODB_ENDPOINT=http://localhost:8000`) | AWS DynamoDB (no endpoint var) |
| Auth | `DEV_AUTH=true`, mock login | Cognito, `DEV_AUTH=false` |
| Metrics | CloudWatch warnings OK (no creds) | EC2/Lambda IAM → metrics work |
| Events | `EVENTS_ENABLED=false` | `EVENTS_ENABLED=true` + SNS ARN |
