import { PutCommand } from '@aws-sdk/lib-dynamodb';
import 'dotenv/config';
import { docClient } from '../src/db/client.js';

const prefix = process.env.TABLE_PREFIX ?? 'mini-jira-';
const tables = {
  teams: `${prefix}Teams`,
  users: `${prefix}Users`,
  projects: `${prefix}Projects`,
  tasks: `${prefix}Tasks`,
  comments: `${prefix}Comments`,
};

const DEV_PASSWORD = 'Demo123!';
const now = new Date().toISOString();

const teams = [
  { teamId: 'frontend', name: 'FRONTEND', createdAt: now },
  { teamId: 'backend', name: 'BACKEND', createdAt: now },
  { teamId: 'qa', name: 'QA', createdAt: now },
  { teamId: 'devops', name: 'DEVOPS', createdAt: now },
];

const users = [
  {
    userId: 'user-ali',
    email: 'ali@company.com',
    name: 'Ali Hassan',
    role: 'manager',
    teamId: 'all',
    devPassword: DEV_PASSWORD,
    createdAt: now,
  },
  {
    userId: 'user-sara',
    email: 'sara@company.com',
    name: 'Sara Ahmed',
    role: 'employee',
    teamId: 'frontend',
    devPassword: DEV_PASSWORD,
    createdAt: now,
  },
  {
    userId: 'user-omar',
    email: 'omar@company.com',
    name: 'Omar Khaled',
    role: 'employee',
    teamId: 'backend',
    devPassword: DEV_PASSWORD,
    createdAt: now,
  },
];

const projectId = 'project-demo-1';

async function put(table: string, item: Record<string, unknown>) {
  await docClient.send(new PutCommand({ TableName: table, Item: item }));
}

async function main() {
  for (const t of teams) {
    await put(tables.teams, t);
    console.log(`Seeded team ${t.teamId}`);
  }

  for (const u of users) {
    await put(tables.users, u);
    console.log(`Seeded user ${u.email}`);
  }

  await put(tables.projects, {
    projectId,
    name: 'MINI-JIRA PLATFORM',
    description: 'Cloud Computing course project - full AWS stack',
    teamId: 'frontend',
    createdBy: 'user-ali',
    createdAt: now,
    updatedAt: now,
  });
  console.log(`Seeded project ${projectId}`);

  const tasks = [
    {
      taskId: 'task-demo-a',
      projectId,
      title: 'IMPLEMENT_KANBAN_UI',
      description: 'Build drag-and-drop Kanban board with task cards and modals',
      status: 'in_progress',
      priority: 'high',
      deadline: '2026-05-22',
      assigneeId: 'user-sara',
      assigneeName: 'Sara Ahmed',
      teamId: 'frontend',
      teamName: 'FRONTEND',
      createdBy: 'user-ali',
      createdAt: now,
      updatedAt: now,
      imageKeys: [],
    },
    {
      taskId: 'task-demo-b',
      projectId,
      title: 'CONFIGURE_DYNAMODB_TABLES',
      description: 'Create tables for Users, Teams, Projects, Tasks with GSI on teamId and assigneeId',
      status: 'todo',
      priority: 'critical',
      deadline: '2026-05-22',
      assigneeId: 'user-omar',
      assigneeName: 'Omar Khaled',
      teamId: 'backend',
      teamName: 'BACKEND',
      createdBy: 'user-ali',
      createdAt: now,
      updatedAt: now,
      imageKeys: [],
    },
    {
      taskId: 'task-frontend-2',
      projectId,
      title: 'SETUP_COGNITO_AUTH',
      description: 'Configure Cognito user pool with custom role and teamId attributes',
      status: 'todo',
      priority: 'high',
      deadline: '2026-05-25',
      assigneeId: 'user-sara',
      assigneeName: 'Sara Ahmed',
      teamId: 'frontend',
      teamName: 'FRONTEND',
      createdBy: 'user-ali',
      createdAt: now,
      updatedAt: now,
      imageKeys: [],
    },
    {
      taskId: 'task-backend-2',
      projectId,
      title: 'SNS_SQS_ASSIGNMENT_WORKER',
      description: 'Wire SNS fan-out to SQS and assignment worker Lambda',
      status: 'in_review',
      priority: 'medium',
      deadline: '2026-05-24',
      assigneeId: 'user-omar',
      assigneeName: 'Omar Khaled',
      teamId: 'backend',
      teamName: 'BACKEND',
      createdBy: 'user-ali',
      createdAt: now,
      updatedAt: now,
      imageKeys: [],
    },
    {
      taskId: 'task-qa-1',
      projectId,
      title: 'E2E_DEMO_SCENARIO_TEST',
      description: 'Verify Ali sees all tasks, Sara/Omar see team-scoped tasks only',
      status: 'todo',
      priority: 'medium',
      deadline: '2026-05-26',
      assigneeId: 'user-sara',
      assigneeName: 'Sara Ahmed',
      teamId: 'qa',
      teamName: 'QA',
      createdBy: 'user-ali',
      createdAt: now,
      updatedAt: now,
      imageKeys: [],
    },
  ];

  for (const task of tasks) {
    await put(tables.tasks, task);
  }
  console.log(`Seeded ${tasks.length} tasks`);

  const comments = [
    {
      taskId: 'task-demo-a',
      commentId: 'comment-1',
      authorId: 'user-ali',
      authorName: 'Ali Hassan',
      body: 'Please prioritize drag-and-drop for the demo.',
      createdAt: now,
    },
    {
      taskId: 'task-demo-a',
      commentId: 'comment-2',
      authorId: 'user-sara',
      authorName: 'Sara Ahmed',
      body: 'Kanban columns wired to API — working on comments modal next.',
      createdAt: now,
    },
    {
      taskId: 'task-demo-b',
      commentId: 'comment-3',
      authorId: 'user-omar',
      authorName: 'Omar Khaled',
      body: 'GSIs on TeamIndex and AssigneeIndex are live.',
      createdAt: now,
    },
  ];

  for (const c of comments) {
    await put(tables.comments, c);
  }
  console.log(`Seeded ${comments.length} comments`);

  console.log('\n--- Seeded login credentials (DEV_AUTH=true) ---');
  console.log(`Password for all users: ${DEV_PASSWORD}\n`);
  for (const u of users) {
    console.log(`  ${u.role.padEnd(8)} ${u.email}`);
  }
  console.log('\nRe-run: cd backend && npm run seed');
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
