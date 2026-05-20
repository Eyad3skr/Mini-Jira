import { ListSubscriptionsByTopicCommand, SetSubscriptionAttributesCommand, SubscribeCommand, SNSClient, } from '@aws-sdk/client-sns';
import { config } from '../config.js';
const sns = new SNSClient({ region: config.awsRegion });
function isRealEmail(email) {
    const e = email.trim().toLowerCase();
    return e.includes('@') && !e.endsWith('@users.local');
}
/** SNS filter: only assignment events for this Cognito/Dynamo user id. */
function filterPolicyFor(userId) {
    return JSON.stringify({ assigneeId: [userId] });
}
/**
 * Subscribe assignee email to the assignment topic (with filter on assigneeId).
 * They must confirm via the AWS "Subscription Confirmation" email once.
 */
export async function ensureAssigneeEmailSubscription(userId, email) {
    if (!config.eventsEnabled || !config.snsAssignmentTopicArn)
        return;
    if (!isRealEmail(email))
        return;
    const endpoint = email.trim().toLowerCase();
    const filterPolicy = filterPolicyFor(userId);
    const topicArn = config.snsAssignmentTopicArn;
    const listed = await sns.send(new ListSubscriptionsByTopicCommand({ TopicArn: topicArn }));
    const existing = listed.Subscriptions?.find((s) => s.Protocol === 'email' && s.Endpoint?.toLowerCase() === endpoint);
    if (existing?.SubscriptionArn && !existing.SubscriptionArn.includes('PendingConfirmation')) {
        await sns.send(new SetSubscriptionAttributesCommand({
            SubscriptionArn: existing.SubscriptionArn,
            AttributeName: 'FilterPolicy',
            AttributeValue: filterPolicy,
        }));
        return;
    }
    if (!existing) {
        await sns.send(new SubscribeCommand({
            TopicArn: topicArn,
            Protocol: 'email',
            Endpoint: endpoint,
            Attributes: { FilterPolicy: filterPolicy },
        }));
    }
}
