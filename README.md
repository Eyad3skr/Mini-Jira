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
