import type { UserProfile } from '../types.js';
export declare function profileNeedsOnboarding(profile: UserProfile): boolean;
/** Create or load a Cognito user's DynamoDB row (no team until onboarding). */
export declare function ensureUserProfile(userId: string, hints?: {
    email?: string;
    name?: string;
}): Promise<UserProfile>;
export declare function completeUserOnboarding(userId: string, data: {
    name: string;
    teamId: string;
}): Promise<UserProfile>;
export declare class OnboardingValidationError extends Error {
    constructor(message: string);
}
export declare function toMeResponse(profile: UserProfile): {
    id: string;
    name: string;
    email: string;
    role: import("../types.js").UserRole;
    teamId: string;
    teamName: string;
    needsOnboarding: boolean;
};
