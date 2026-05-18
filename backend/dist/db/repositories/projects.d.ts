import type { Project } from '../../types.js';
export declare function listProjects(teamId?: string): Promise<Project[]>;
export declare function getProject(projectId: string): Promise<Project | null>;
export declare function createProject(project: Project): Promise<Project>;
export declare function updateProject(projectId: string, updates: Partial<Project>): Promise<Project | null>;
export declare function deleteProject(projectId: string): Promise<boolean>;
