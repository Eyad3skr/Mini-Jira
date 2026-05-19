#!/usr/bin/env bash
# Re-send SNS email subscription confirmation for assignment notifications.
set -euo pipefail

REGION="${AWS_REGION:-eu-north-1}"
TOPIC_ARN="${SNS_ASSIGNMENT_TOPIC_ARN:-arn:aws:sns:eu-north-1:452031276830:mini-jira-task-assignments}"
EMAIL="${1:-${NOTIFY_EMAIL:-}}"

if [[ -z "$EMAIL" ]]; then
  echo "Usage: NOTIFY_EMAIL=you@example.com $0"
  echo "   or: $0 you@example.com"
  exit 1
fi

echo "Topic: $TOPIC_ARN"
echo "Email: $EMAIL"

# Remove existing email subscription(s) for this address on the topic
while read -r sub_arn; do
  if [[ -n "$sub_arn" && "$sub_arn" != "None" ]]; then
    echo "Removing old subscription: $sub_arn"
    aws sns unsubscribe --subscription-arn "$sub_arn" --region "$REGION" 2>/dev/null || true
  fi
done < <(
  aws sns list-subscriptions-by-topic \
    --topic-arn "$TOPIC_ARN" \
    --region "$REGION" \
    --query "Subscriptions[?Protocol=='email' && Endpoint=='${EMAIL}'].SubscriptionArn" \
    --output text | tr '\t' '\n'
)

echo "Subscribing $EMAIL (check inbox and click Confirm subscription)..."
aws sns subscribe \
  --topic-arn "$TOPIC_ARN" \
  --protocol email \
  --notification-endpoint "$EMAIL" \
  --region "$REGION" \
  --output text

echo ""
echo "Open the email from AWS Notifications and confirm the subscription."
echo "Until status is Confirmed, assignment emails will not be delivered."
