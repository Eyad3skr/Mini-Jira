/**
 * Repair DynamoDB user emails from Cognito (fixes @users.local placeholders).
 *
 *   cd backend && npx tsx scripts/sync-emails-from-cognito.ts
 */
import 'dotenv/config';
import {
  CognitoIdentityProviderClient,
  ListUsersCommand,
} from '@aws-sdk/client-cognito-identity-provider';
import * as usersRepo from '../src/db/repositories/users.js';
import { config } from '../src/config.js';

const cognito = new CognitoIdentityProviderClient({ region: config.awsRegion });

async function main() {
  if (!config.cognito.userPoolId) {
    console.error('COGNITO_USER_POOL_ID not set');
    process.exit(1);
  }

  let token: string | undefined;
  let fixed = 0;
  let skipped = 0;

  do {
    const page = await cognito.send(
      new ListUsersCommand({
        UserPoolId: config.cognito.userPoolId,
        PaginationToken: token,
        Limit: 60,
      })
    );

    for (const u of page.Users ?? []) {
      const userId = u.Username!;
      const cognitoEmail =
        u.Attributes?.find((a) => a.Name === 'email')?.Value?.trim() ?? '';
      if (!cognitoEmail) {
        console.log(`Skip ${userId} (no Cognito email)`);
        skipped++;
        continue;
      }

      const existing = await usersRepo.getUser(userId);
      if (!existing) {
        console.log(`Skip ${userId} (no DynamoDB row yet — will sync on first login)`);
        skipped++;
        continue;
      }

      if (existing.email === cognitoEmail) {
        console.log(`OK ${cognitoEmail}`);
        continue;
      }

      await usersRepo.upsertUser({ ...existing, email: cognitoEmail });
      console.log(`Fixed ${userId}: ${existing.email} → ${cognitoEmail}`);
      fixed++;
    }

    token = page.PaginationToken;
  } while (token);

  console.log(`Done. Fixed ${fixed}, skipped ${skipped}.`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
