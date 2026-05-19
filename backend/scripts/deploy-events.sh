#!/usr/bin/env bash
# SNS (assignments + digest), SQS → assignment-worker, EventBridge → daily-digest
set -euo pipefail

REGION="${AWS_REGION:-eu-north-1}"
ACCOUNT="${AWS_ACCOUNT_ID:-$(aws sts get-caller-identity --query Account --output text)}"
PREFIX="${EVENT_PREFIX:-mini-jira}"
TABLE_PREFIX="${TABLE_PREFIX:-mini-jira-}"

ASSIGNMENT_TOPIC_NAME="${ASSIGNMENT_TOPIC_NAME:-${PREFIX}-task-assignments}"
DIGEST_TOPIC_NAME="${DIGEST_TOPIC_NAME:-${PREFIX}-daily-digest}"
QUEUE_NAME="${ASSIGNMENT_QUEUE_NAME:-${PREFIX}-assignment-events}"
ASSIGNMENT_FN="${ASSIGNMENT_FN:-${PREFIX}-assignment-worker}"
DIGEST_FN="${DIGEST_FN:-${PREFIX}-daily-digest}"
ASSIGNMENT_ROLE="${ASSIGNMENT_ROLE:-${PREFIX}-assignment-worker-role}"
DIGEST_ROLE="${DIGEST_ROLE:-${PREFIX}-daily-digest-role}"

ACTIVITY_TABLE="${TABLE_PREFIX}ActivityLog"
TASKS_TABLE="${TABLE_PREFIX}Tasks"
CW_NAMESPACE="${CLOUDWATCH_NAMESPACE:-MiniJira}"

# Optional: export NOTIFY_EMAIL=you@example.com before running (SNS email confirm required)
NOTIFY_EMAIL="${NOTIFY_EMAIL:-}"

ROOT="$(cd "$(dirname "$0")/.." && pwd)"

echo "Region: $REGION | Account: $ACCOUNT"

create_topic() {
  local name="$1"
  local arn
  arn="$(aws sns create-topic --name "$name" --region "$REGION" --query TopicArn --output text 2>/dev/null || true)"
  if [[ -z "$arn" || "$arn" == "None" ]]; then
    arn="$(aws sns list-topics --region "$REGION" --query "Topics[?contains(TopicArn, ':${name}')].TopicArn | [0]" --output text)"
  fi
  echo "$arn"
}

subscribe_email() {
  local topic_arn="$1"
  local label="$2"
  if [[ -z "$NOTIFY_EMAIL" ]]; then
    echo "  (skip email for $label — set NOTIFY_EMAIL to subscribe)"
    return
  fi
  aws sns subscribe \
    --region "$REGION" \
    --topic-arn "$topic_arn" \
    --protocol email \
    --notification-endpoint "$NOTIFY_EMAIL" \
    --output text >/dev/null
  echo "  Email subscription pending for $label → $NOTIFY_EMAIL (check inbox to confirm)"
}

ASSIGNMENT_TOPIC_ARN="$(create_topic "$ASSIGNMENT_TOPIC_NAME")"
DIGEST_TOPIC_ARN="$(create_topic "$DIGEST_TOPIC_NAME")"
echo "Assignment SNS: $ASSIGNMENT_TOPIC_ARN"
echo "Digest SNS:       $DIGEST_TOPIC_ARN"

subscribe_email "$ASSIGNMENT_TOPIC_ARN" "task assignments"
subscribe_email "$DIGEST_TOPIC_ARN" "daily digest"

echo "Creating SQS queue $QUEUE_NAME..."
QUEUE_URL="$(aws sqs create-queue \
  --queue-name "$QUEUE_NAME" \
  --region "$REGION" \
  --attributes '{"VisibilityTimeout":"60","MessageRetentionPeriod":"1209600"}' \
  --query QueueUrl --output text 2>/dev/null || true)"
if [[ -z "$QUEUE_URL" || "$QUEUE_URL" == "None" ]]; then
  QUEUE_URL="$(aws sqs get-queue-url --queue-name "$QUEUE_NAME" --region "$REGION" --query QueueUrl --output text)"
fi
QUEUE_ARN="$(aws sqs get-queue-attributes --queue-url "$QUEUE_URL" --attribute-names QueueArn --region "$REGION" --query Attributes.QueueArn --output text)"
echo "SQS queue: $QUEUE_ARN"

echo "SQS policy + SNS → SQS subscription..."
POLICY_FILE="$(mktemp)"
cat > "$POLICY_FILE" <<EOF
{
  "Version": "2012-10-17",
  "Statement": [{
    "Effect": "Allow",
    "Principal": { "Service": "sns.amazonaws.com" },
    "Action": "sqs:SendMessage",
    "Resource": "${QUEUE_ARN}",
    "Condition": { "ArnEquals": { "aws:SourceArn": "${ASSIGNMENT_TOPIC_ARN}" } }
  }]
}
EOF
POLICY_STR="$(python3 -c "import json; print(json.dumps(open('$POLICY_FILE').read()))")"
aws sqs set-queue-attributes \
  --queue-url "$QUEUE_URL" \
  --attributes "{\"Policy\":${POLICY_STR}}" \
  --region "$REGION"
rm -f "$POLICY_FILE"

aws sns subscribe \
  --region "$REGION" \
  --topic-arn "$ASSIGNMENT_TOPIC_ARN" \
  --protocol sqs \
  --notification-endpoint "$QUEUE_ARN" \
  --attributes "RawMessageDelivery=false" \
  --output text >/dev/null

ensure_lambda_role() {
  local role_name="$1"
  local policy_name="$2"
  local policy_doc="$3"
  local arn
  arn="$(aws iam get-role --role-name "$role_name" --query Role.Arn --output text 2>/dev/null || true)"
  if [[ -z "${arn:-}" ]]; then
    TRUST='{"Version":"2012-10-17","Statement":[{"Effect":"Allow","Principal":{"Service":"lambda.amazonaws.com"},"Action":"sts:AssumeRole"}]}'
    arn="$(aws iam create-role --role-name "$role_name" --assume-role-policy-document "$TRUST" --query Role.Arn --output text)"
    aws iam attach-role-policy --role-name "$role_name" \
      --policy-arn arn:aws:iam::aws:policy/service-role/AWSLambdaBasicExecutionRole
    sleep 8
  fi
  aws iam put-role-policy --role-name "$role_name" --policy-name "$policy_name" --policy-document "$policy_doc"
  echo "$arn"
}

package_lambda() {
  local dir="$1"
  local zip="$2"
  cd "$dir"
  rm -rf node_modules package-lock.json
  npm install --omit=dev --platform=linux --arch=x64 --libc=glibc 2>/dev/null || npm install --omit=dev
  rm -f "$zip"
  zip -rq "$zip" index.mjs package.json node_modules
}

deploy_lambda() {
  local fn_name="$1"
  local role_arn="$2"
  local zip_path="$3"
  local env_vars="$4"
  local arn
  if aws lambda get-function --function-name "$fn_name" --region "$REGION" >/dev/null 2>&1; then
    aws lambda update-function-code --function-name "$fn_name" --zip-file "fileb://$zip_path" --region "$REGION" >/dev/null
    aws lambda wait function-updated --function-name "$fn_name" --region "$REGION"
    aws lambda update-function-configuration \
      --function-name "$fn_name" --region "$REGION" \
      --runtime nodejs22.x --handler index.handler --timeout 60 --memory-size 256 \
      --environment "Variables={${env_vars}}" >/dev/null
  else
    aws lambda create-function \
      --function-name "$fn_name" --region "$REGION" \
      --runtime nodejs22.x --role "$role_arn" --handler index.handler \
      --zip-file "fileb://$zip_path" --timeout 60 --memory-size 256 \
      --environment "Variables={${env_vars}}" >/dev/null
    aws lambda wait function-active --function-name "$fn_name" --region "$REGION"
  fi
  aws lambda get-function --function-name "$fn_name" --region "$REGION" --query Configuration.FunctionArn --output text
}

ASSIGNMENT_POLICY="$(cat <<EOF
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": ["sqs:ReceiveMessage", "sqs:DeleteMessage", "sqs:GetQueueAttributes"],
      "Resource": "${QUEUE_ARN}"
    },
    {
      "Effect": "Allow",
      "Action": ["dynamodb:PutItem"],
      "Resource": "arn:aws:dynamodb:${REGION}:${ACCOUNT}:table/${ACTIVITY_TABLE}"
    },
    {
      "Effect": "Allow",
      "Action": ["cloudwatch:PutMetricData"],
      "Resource": "*"
    }
  ]
}
EOF
)"
ASSIGNMENT_ROLE_ARN="$(ensure_lambda_role "$ASSIGNMENT_ROLE" "assignment-inline" "$ASSIGNMENT_POLICY")"

ASSIGNMENT_ZIP="/tmp/${ASSIGNMENT_FN}.zip"
package_lambda "$ROOT/lambdas/assignment-worker" "$ASSIGNMENT_ZIP"
ASSIGNMENT_ENV="ACTIVITY_TABLE=${ACTIVITY_TABLE},CLOUDWATCH_NAMESPACE=${CW_NAMESPACE}"
ASSIGNMENT_LAMBDA_ARN="$(deploy_lambda "$ASSIGNMENT_FN" "$ASSIGNMENT_ROLE_ARN" "$ASSIGNMENT_ZIP" "$ASSIGNMENT_ENV")"
echo "Assignment worker: $ASSIGNMENT_LAMBDA_ARN"

echo "SQS event source mapping..."
MAPPING="$(aws lambda list-event-source-mappings --function-name "$ASSIGNMENT_FN" --region "$REGION" --query "EventSourceMappings[?EventSourceArn=='${QUEUE_ARN}'].UUID | [0]" --output text)"
if [[ -z "$MAPPING" || "$MAPPING" == "None" ]]; then
  aws lambda create-event-source-mapping \
    --function-name "$ASSIGNMENT_FN" \
    --event-source-arn "$QUEUE_ARN" \
    --batch-size 10 \
    --region "$REGION" >/dev/null
else
  echo "  Mapping already exists: $MAPPING"
fi

DIGEST_POLICY="$(cat <<EOF
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": ["dynamodb:Scan"],
      "Resource": "arn:aws:dynamodb:${REGION}:${ACCOUNT}:table/${TASKS_TABLE}"
    },
    {
      "Effect": "Allow",
      "Action": ["sns:Publish"],
      "Resource": "${DIGEST_TOPIC_ARN}"
    }
  ]
}
EOF
)"
DIGEST_ROLE_ARN="$(ensure_lambda_role "$DIGEST_ROLE" "digest-inline" "$DIGEST_POLICY")"

DIGEST_ZIP="/tmp/${DIGEST_FN}.zip"
package_lambda "$ROOT/lambdas/daily-digest" "$DIGEST_ZIP"
DIGEST_ENV="TASKS_TABLE=${TASKS_TABLE},DIGEST_TOPIC_ARN=${DIGEST_TOPIC_ARN}"
DIGEST_LAMBDA_ARN="$(deploy_lambda "$DIGEST_FN" "$DIGEST_ROLE_ARN" "$DIGEST_ZIP" "$DIGEST_ENV")"
echo "Daily digest: $DIGEST_LAMBDA_ARN"

RULE_NAME="${PREFIX}-daily-digest-9am"
aws events put-rule \
  --name "$RULE_NAME" \
  --region "$REGION" \
  --schedule-expression "cron(0 9 * * ? *)" \
  --state ENABLED \
  --description "Mini-Jira daily task digest" >/dev/null

aws lambda add-permission \
  --function-name "$DIGEST_FN" \
  --region "$REGION" \
  --statement-id "${RULE_NAME}-invoke" \
  --action lambda:InvokeFunction \
  --principal events.amazonaws.com \
  --source-arn "arn:aws:events:${REGION}:${ACCOUNT}:rule/${RULE_NAME}" 2>/dev/null || true

aws events put-targets \
  --rule "$RULE_NAME" \
  --region "$REGION" \
  --targets "Id"="1","Arn"="${DIGEST_LAMBDA_ARN}" >/dev/null

echo ""
echo "========== Add to backend/.env =========="
echo "EVENTS_ENABLED=true"
echo "SNS_ASSIGNMENT_TOPIC_ARN=${ASSIGNMENT_TOPIC_ARN}"
echo "========================================="
echo ""
echo "Restart API after updating .env."
if [[ -n "$NOTIFY_EMAIL" ]]; then
  echo "Confirm both SNS email subscriptions in your inbox."
fi
echo "Test assignment: create a task as manager with EVENTS_ENABLED=true."
