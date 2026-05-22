import type { UserProfile } from '../../types.js';
export declare function getUser(userId: string): Promise<UserProfile | null>;
export declare function listUsersByTeam(teamId: string): Promise<UserProfile[]>;
export declare function listAllUsers(): Promise<UserProfile[]>;
export declare function getUserByEmail(email: string): Promise<UserProfile | null>;
export declare function upsertUser(user: UserProfile): Promise<UserProfile>;
export declare function deleteUser(userId: string): Promise<boolean>;
