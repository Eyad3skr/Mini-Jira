import * as auditRepo from '../db/repositories/audit.js';
import * as commentsRepo from '../db/repositories/comments.js';
import * as projectsRepo from '../db/repositories/projects.js';
import * as tasksRepo from '../db/repositories/tasks.js';
import * as teamsRepo from '../db/repositories/teams.js';
import * as usersRepo from '../db/repositories/users.js';
import { RESERVED_TEAM_IDS } from '../constants/teams.js';

export interface TeamDeletePreview {
  teamId: string;
  name: string;
  users: number;
  projects: number;
  tasks: number;
}

export class TeamLifecycleError extends Error {
  constructor(
    message: string,
    public readonly code: 'NOT_FOUND' | 'FORBIDDEN' | 'VALIDATION'
  ) {
    super(message);
    this.name = 'TeamLifecycleError';
  }
}

export async function getTeamDeletePreview(teamId: string): Promise<TeamDeletePreview> {
  const team = await teamsRepo.getTeam(teamId);
  if (!team) {
    throw new TeamLifecycleError('Team not found', 'NOT_FOUND');
  }

  const [users, projects, tasks] = await Promise.all([
    usersRepo.listUsersByTeam(teamId),
    projectsRepo.listProjects(teamId),
    tasksRepo.listTasksByTeam(teamId),
  ]);

  return {
    teamId: team.teamId,
    name: team.name,
    users: users.length,
    projects: projects.length,
    tasks: tasks.length,
  };
}

async function deleteTaskWithDependents(taskId: string): Promise<void> {
  await commentsRepo.deleteCommentsForTask(taskId);
  await auditRepo.deleteAuditForTask(taskId);
  await tasksRepo.deleteTask(taskId);
}

export async function deleteTeamAndDependencies(teamId: string): Promise<void> {
  if (RESERVED_TEAM_IDS.has(teamId)) {
    throw new TeamLifecycleError(`Cannot delete reserved team "${teamId}"`, 'FORBIDDEN');
  }

  const team = await teamsRepo.getTeam(teamId);
  if (!team) {
    throw new TeamLifecycleError('Team not found', 'NOT_FOUND');
  }

  const tasks = await tasksRepo.listTasksByTeam(teamId);
  for (const task of tasks) {
    await deleteTaskWithDependents(task.taskId);
  }

  const projects = await projectsRepo.listProjects(teamId);
  for (const project of projects) {
    await projectsRepo.deleteProject(project.projectId);
  }

  const users = await usersRepo.listUsersByTeam(teamId);
  for (const user of users) {
    await usersRepo.deleteUser(user.userId);
  }

  await teamsRepo.deleteTeam(teamId);
}

export async function syncTeamDisplayName(teamId: string, teamName: string): Promise<void> {
  await tasksRepo.syncTeamNameForTeam(teamId, teamName);
}
