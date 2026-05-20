import { AdminGetUserCommand, CognitoIdentityProviderClient } from '@aws-sdk/client-cognito-identity-provider';
import { config } from '../config.js';
const cognito = new CognitoIdentityProviderClient({ region: config.awsRegion });
/** Load verified email from Cognito (access tokens often omit email). */
export async function getCognitoUserEmail(userId) {
    if (!config.cognito.userPoolId)
        return undefined;
    try {
        const res = await cognito.send(new AdminGetUserCommand({
            UserPoolId: config.cognito.userPoolId,
            Username: userId,
        }));
        const email = res.UserAttributes?.find((a) => a.Name === 'email')
            ?.Value?.trim();
        return email || undefined;
    }
    catch {
        return undefined;
    }
}
