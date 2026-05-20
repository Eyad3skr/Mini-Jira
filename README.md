# Mini-Jira

Lightweight team task management (Cloud Computing 2026). **Live app:** [https://d2nnx11y19xl0z.cloudfront.net](https://d2nnx11y19xl0z.cloudfront.net)

| | |
|--|--|
| **Region** | `eu-north-1` |
| **Repo** | [github.com/Eyad3skr/Mini-Jira](https://github.com/Eyad3skr/Mini-Jira) |
| **Deadline** | 22 May 2026, 11:59 PM |

## Demo login (production)

Sign in with **AWS Cognito** (not dev mock). Use the demo users created in your user pool (e.g. Ali, Sara, Omar) with passwords set in Cognito.

| User | Role | What they see |
|------|------|----------------|
| **Ali Hassan** | Manager | All tasks; can assign across teams |
| **Sara Ahmed** | Employee (Frontend) | Frontend team tasks only |
| **Omar Khaled** | Employee (Backend) | Backend team tasks only |

**Demo flow:** Ali creates Task A → Sara (frontend) and Task B → Omar (backend). Sara sees only A; Omar only B; Ali sees both. Team isolation is enforced **server-side** (`assertTaskAccess`, DynamoDB GSI on `teamId`).

Local dev uses mock login — see [Local development](#local-development) below.

## Architecture

- **Diagram (topology):** [docs/architecture-diagram.svg](docs/architecture-diagram.svg)
- **Graded diagram (AWS icons):** export to `docs/architecture-diagram.png` or `.pdf` — see [docs/ARCHITECTURE-DIAGRAM.md](docs/ARCHITECTURE-DIAGRAM.md)
- **Technical overview:** [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md)
- **AWS deploy checklist:** [infrastructure/AWS-DEPLOYMENT.md](infrastructure/AWS-DEPLOYMENT.md)
- **VPC private EC2 runbook:** [infrastructure/VPC-PRIVATE-EC2-MIGRATION.md](infrastructure/VPC-PRIVATE-EC2-MIGRATION.md)
- **Course PDF mirror:** [docs/COURSE-REQUIREMENTS.md](docs/COURSE-REQUIREMENTS.md)

## Local vs production

| | Local | Production (deployed) |
|--|--------|------------------------|
| **URL** | http://localhost:5173 | CloudFront URL above |
| **Auth** | `DEV_AUTH=true`, `VITE_DEV_MOCK_LOGIN=true` | Cognito OIDC, mock login **off** |
| **Database** | DynamoDB Local (`docker compose`) | AWS DynamoDB |
| **API** | `npm run dev:api` (:3001) | Express on EC2 ASG behind ALB |
| **Frontend build** | `npm run dev` | Build on EC2 with prod `.env` (see below) |
| **Admin access** | N/A | **SSM Session Manager** (not SSH to public IP) |

## Local development

### Prerequisites

- Node.js 20+
- Docker (DynamoDB Local)

### Setup

```bash
npm run setup
# or: npm install && npm install --prefix frontend && npm install --prefix backend
docker compose up -d
npm run db:setup

npm run dev:api    # terminal 1 — API :3001
npm run dev        # terminal 2 — UI :5173
```

Open http://localhost:5173 and use dev profiles (Ali / Sara / Omar) when `VITE_DEV_MOCK_LOGIN=true`.

- Frontend env: `frontend/.env.example`
- Backend env: `backend/.env` — `DEV_AUTH=true`, `DYNAMODB_ENDPOINT=http://localhost:8000`

## Production operations

**Do not rsync `frontend/dist/` from your Mac to production.** Local `.env` often has `VITE_DEV_MOCK_LOGIN=true` and `localhost` Cognito URLs, which breaks production login.

### Frontend (EC2 + CloudFront)

On **each** ASG instance (or build once and sync), using **SSM Session Manager** — not laptop rsync of `dist/`:

```bash
cd ~/Mini-Jira/frontend
git pull
# Confirm production .env:
#   VITE_DEV_MOCK_LOGIN=false
#   VITE_COGNITO_REDIRECT_URI / LOGOUT_URI = CloudFront URL
npm run build
sudo rsync -a --delete dist/ /var/www/mini-jira/
aws cloudfront create-invalidation --distribution-id E19LM6JGGQ56CX --paths "/*"
```

Instance role `mini-jira-ec2-role` needs `cloudfront:CreateInvalidation`, or run invalidation from an admin IAM user. Repeat on both instances if `/var/www/mini-jira` is not shared.

### Backend (EC2)

On **both** ASG instances:

```bash
cd ~/Mini-Jira && git pull
cd backend && npm ci && npm run build   # npm ci when package.json changed
pm2 restart mini-jira-api
```

### Cost / course policy

- **Stop** ASG or instances when idle; **do not terminate** graded resources (termination = zero).
- Push from laptop before `git pull` on EC2 if you expect new code.

Full phase checklist and resource names: [infrastructure/AWS-DEPLOYMENT.md](infrastructure/AWS-DEPLOYMENT.md).

## Project layout

```
Mini-Jira/
├── frontend/          # React + Vite
├── backend/           # Express API + lambdas/
├── infrastructure/    # Deploy notes, CloudWatch JSON
├── docs/              # Architecture, course requirements, diagrams
└── docker-compose.yml
```

## AWS stack (summary)

Cognito, DynamoDB, S3, Lambda (image resize, assignment worker, daily digest), SNS, SQS, EventBridge, CloudWatch, EC2 ASG (private subnets), ALB, CloudFront, VPC + NAT.

Lambdas: `backend/lambdas/`. Monitoring: namespace `MiniJira`, dashboard `MiniJira`, alarm `mini-jira-tasks-created-activity` → SNS `mini-jira-alarms`.

## Submission checklist

- [ ] GitHub repo link (this repo)
- [ ] Architecture diagram with **AWS official icons** in repo — [docs/ARCHITECTURE-DIAGRAM.md](docs/ARCHITECTURE-DIAGRAM.md)
- [ ] Working public link: [CloudFront URL](https://d2nnx11y19xl0z.cloudfront.net)
- [ ] Demo video
- [ ] [Google Form](https://docs.google.com/forms/d/e/1FAIpQLSdOo4eouZwbf-dNVfwFvraYxGZx6TTdsflE-DISRQX3jWTPkg/viewform)
- [ ] Stop (not terminate) instances when not demoing

### Course requirements traceability

| Requirement | Where |
|-------------|--------|
| HA + 2 AZ + ALB + ASG + CloudFront | [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md), VPC runbook |
| Private EC2 + NAT | [infrastructure/VPC-PRIVATE-EC2-MIGRATION.md](infrastructure/VPC-PRIVATE-EC2-MIGRATION.md) |
| Cognito + server-side team filter | `backend/src/middleware/auth.ts`, task routes |
| SNS → SQS → worker | `backend/lambdas/assignment-worker` |
| EventBridge 9 AM digest | `backend/lambdas/daily-digest` |
| CloudWatch 4 widgets + alarm | [infrastructure/cloudwatch-dashboard.json](infrastructure/cloudwatch-dashboard.json) |
| Demo scenario | Above + seed script |

**Optional gaps:** formal AWS-icon diagram file (TODO), demo video + form (you). Activity alarm uses task-creation metric; overdue view is in app Analytics UI.

## Uncommitted / local-only changes (note)

If not yet pushed, your machine may have local edits for:

- `backend/src/services/metrics.ts` — `TimeToCloseHours`, `recordTimeToClose`
- `backend/src/routes/tasks.ts` — metric on status → Done
- `infrastructure/cloudwatch-dashboard.json` — widgets + ASG CPU
- `infrastructure/VPC-PRIVATE-EC2-MIGRATION.md` — VPC runbook

Commit when ready so EC2 `git pull` stays in sync.
