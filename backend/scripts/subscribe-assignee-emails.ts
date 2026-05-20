/**
 * One-time: subscribe existing Users table emails to the assignment SNS topic
 * (filter: assigneeId = userId). Each inbox must confirm the AWS subscription email.
 *
 *   cd backend && npx tsx scripts/subscribe-assignee-emails.ts
 */
import 'dotenv/config';
import * as usersRepo from '../src/db/repositories/users.js';
import { ensureAssigneeEmailSubscription } from '../src/services/snsAssignee.js';

async function main() {
  const users = await usersRepo.listAllUsers();
  for (const u of users) {
    if (!u.email?.includes('@') || u.email.endsWith('@users.local')) {
      console.log(`Skip ${u.userId} (${u.email})`);
      continue;
    }
    await ensureAssigneeEmailSubscription(u.userId, u.email);
    console.log(`Subscribed (or updated filter) ${u.email} → assigneeId ${u.userId}`);
  }
  console.log('Done. Check inboxes for SNS confirmation links where status was pending.');
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
