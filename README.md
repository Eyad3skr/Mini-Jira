# Mini-Jira

Lightweight team task-management app (Cloud Computing 2026 project) with retro terminal UI, Express API, and DynamoDB.

## Project layout

```
Mini-Jira/
├── frontend/          # React + Vite (port 5173)
├── backend/           # Express API (port 3001)
├── infrastructure/  # AWS deployment notes
├── docs/
└── docker-compose.yml
```

## Quick Start (Local)

### Prerequisites

- Node.js 20+
- Docker (for DynamoDB Local)

### Setup

```bash
# Install dependencies
npm run setup
# Or manually:
npm install && npm install --prefix frontend && npm install --prefix backend
docker compose up -d
npm run db:setup

# Terminal 1: API (port 3001)
npm run dev:api

# Terminal 2: Frontend (port 5173)
npm run dev
```

Open http://localhost:5173 and sign in with a dev profile (Ali / Sara / Omar).

### Demo Scenario

| User | Role | Sees |
|------|------|------|
| Ali Hassan | Manager | All tasks, team filter |
| Sara Ahmed | Employee (Frontend) | Frontend tasks only |
| Omar Khaled | Employee (Backend) | Backend tasks only |

## Environment

- Frontend: `frontend/.env` — see `frontend/.env.example` (Cognito OIDC + optional `VITE_DEV_MOCK_LOGIN`)
- Backend: `backend/.env` — `DEV_AUTH=true`, `DYNAMODB_ENDPOINT=http://localhost:8000`

## Architecture

See [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) and [infrastructure/README.md](infrastructure/README.md).

## AWS Components

- Cognito, DynamoDB, S3, Lambda (image resize, assignment worker, daily digest)
- SNS, SQS, EventBridge, CloudWatch
- EC2 ASG, ALB, CloudFront

Lambdas live in `backend/lambdas/`.

## Deploy frontend to production (EC2 + CloudFront)

The Vite build **bakes in** `frontend/.env` at compile time (`VITE_COGNITO_REDIRECT_URI`, `VITE_DEV_MOCK_LOGIN`, etc.). Your laptop `.env` is for **local dev** (localhost, mock login). **Do not** copy `dist/` from your Mac to production unless you built with production variables.

**Always build on EC2** using the server’s production `frontend/.env` (CloudFront URL, `VITE_DEV_MOCK_LOGIN=false`), then publish to nginx and clear the CloudFront cache.

SSH into an app instance and run:

```bash
# On EC2 (uses production .env on the server — not your laptop)
cd ~/Mini-Jira/frontend
git pull   # if you use git on the server
npm run build
sudo rsync -a --delete dist/ /var/www/mini-jira/

aws cloudfront create-invalidation --distribution-id E19LM6JGGQ56CX --paths "/*"
```

Repeat the `rsync` step on **both** ASG instances if they do not share `/var/www/mini-jira` (or build once and sync `dist/` to the peer). After invalidation completes (~1–2 minutes), hard refresh or use a private window at your CloudFront URL.

Full stack checklist: [infrastructure/AWS-DEPLOYMENT.md](infrastructure/AWS-DEPLOYMENT.md).
