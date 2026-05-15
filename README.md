# Mini-Jira

Lightweight team task-management app (Cloud Computing 2026 project) with retro terminal UI, Express API, and DynamoDB.

## Quick Start (Local)

### Prerequisites

- Node.js 20+
- Docker (for DynamoDB Local)

### Setup

```bash
# Install dependencies
npm install
cd backend && npm install && cd ..

# Start DynamoDB Local
docker compose up -d

# Create tables and seed demo data (Ali, Sara, Omar + Task A/B)
cd backend && npm run create-tables && npm run seed && cd ..

# Terminal 1: API (port 3001)
cd backend && npm run dev

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

- Frontend: `.env` — `VITE_DEV_MOCK_LOGIN=true`, `VITE_API_URL=` (empty uses Vite proxy)
- Backend: `backend/.env` — `DEV_AUTH=true`, `DYNAMODB_ENDPOINT=http://localhost:8000`

## Architecture

See [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) and [infrastructure/README.md](infrastructure/README.md).

## AWS Components

- Cognito, DynamoDB, S3, Lambda (image resize, assignment worker, daily digest)
- SNS, SQS, EventBridge, CloudWatch
- EC2 ASG, ALB, CloudFront

Lambdas live in `backend/lambdas/`.
# Mini-Jira
