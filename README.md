# Mini-Jira

Team task management on AWS — React frontend, Express API, DynamoDB, and event-driven notifications.

**Production:** [https://d2nnx11y19xl0z.cloudfront.net](https://d2nnx11y19xl0z.cloudfront.net) · **Region:** `eu-north-1` · **Repository:** [github.com/Eyad3skr/Mini-Jira](https://github.com/Eyad3skr/Mini-Jira)

## Authentication (production)

Sign in with **AWS Cognito**. Demo accounts (configured in the user pool):

| User | Role | Scope |
|------|------|--------|
| **Ali Hassan** | Manager | All tasks; assign across teams |
| **Sara Ahmed** | Employee (Frontend) | Frontend team only |
| **Omar Khaled** | Employee (Backend) | Backend team only |

Team boundaries are enforced on the API (`assertTaskAccess`, DynamoDB GSI on `teamId`). Local development uses mock login — see below.

## Architecture

![Production topology](docs/architecture-diagram.svg)

| Document | Description |
|----------|-------------|
| [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) | System design, data model, monitoring |
| [docs/architecture-diagram.svg](docs/architecture-diagram.svg) | Topology (SVG source) |
| [docs/ARCHITECTURE-DIAGRAM.md](docs/ARCHITECTURE-DIAGRAM.md) | Formal diagram (AWS Architecture Icons) |
| [infrastructure/AWS-DEPLOYMENT.md](infrastructure/AWS-DEPLOYMENT.md) | Deployment checklist and resource IDs |
| [infrastructure/VPC-PRIVATE-EC2-MIGRATION.md](infrastructure/VPC-PRIVATE-EC2-MIGRATION.md) | VPC layout and private EC2 runbook |

## Local vs production

| | Local | Production |
|--|--------|------------|
| **URL** | http://localhost:5173 | CloudFront (link above) |
| **Auth** | `DEV_AUTH=true`, `VITE_DEV_MOCK_LOGIN=true` | Cognito OIDC |
| **Database** | DynamoDB Local (`docker compose`) | AWS DynamoDB |
| **API** | `npm run dev:api` (:3001) | Express on EC2 ASG behind ALB |
| **Frontend** | `npm run dev` | Built on EC2 with production `.env` |
| **Instance access** | — | SSM Session Manager |

## Local development

**Prerequisites:** Node.js 20+, Docker

```bash
npm run setup
docker compose up -d
npm run db:setup

npm run dev:api    # API on :3001
npm run dev        # UI on :5173
```

Environment templates: `frontend/.env.example`, `backend/.env` (`DEV_AUTH=true`, `DYNAMODB_ENDPOINT=http://localhost:8000`).

## Production operations

Do not copy `frontend/dist/` from a developer machine into production. Vite embeds `frontend/.env` at build time; local files often enable mock login and localhost Cognito URLs.

### Frontend

On each ASG instance (via SSM Session Manager):

```bash
cd ~/Mini-Jira/frontend
git pull
# Production .env: VITE_DEV_MOCK_LOGIN=false, Cognito redirect/logout = CloudFront URL
npm run build
sudo rsync -a --delete dist/ /var/www/mini-jira/
aws cloudfront create-invalidation --distribution-id E19LM6JGGQ56CX --paths "/*"
```

The instance role `mini-jira-ec2-role` needs `cloudfront:CreateInvalidation`, or run invalidation with an IAM admin principal.

### Backend

On both ASG instances:

```bash
cd ~/Mini-Jira && git pull
cd backend && npm ci && npm run build
pm2 restart mini-jira-api
```

Run `npm ci` in `backend/` when `package.json` changes.

### Cost

Stop the ASG or scale to zero when the environment is idle. Avoid terminating long-lived resources (VPC, ALB, DynamoDB tables) unless you intend to rebuild them.

Deploy reference: [infrastructure/AWS-DEPLOYMENT.md](infrastructure/AWS-DEPLOYMENT.md).

## Repository layout

```
Mini-Jira/
├── frontend/          # React + Vite
├── backend/           # Express API, lambdas/
├── infrastructure/    # Deploy notes, CloudWatch dashboard JSON
├── docs/              # Architecture and diagrams
└── docker-compose.yml
```

## Stack

Cognito · DynamoDB · S3 · Lambda (image resize, assignment worker, daily digest) · SNS · SQS · EventBridge · CloudWatch · EC2 ASG · ALB · CloudFront · VPC with NAT gateways

Custom metrics namespace `MiniJira`; dashboard `MiniJira`; alarm `mini-jira-tasks-created-activity` → SNS `mini-jira-alarms`.
