/** Load verified email from Cognito (access tokens often omit email). */
export declare function getCognitoUserEmail(userId: string): Promise<string | undefined>;
