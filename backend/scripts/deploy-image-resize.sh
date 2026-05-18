#!/usr/bin/env bash
set -euo pipefail

REGION="${AWS_REGION:-eu-north-1}"
ACCOUNT="${AWS_ACCOUNT_ID:-$(aws sts get-caller-identity --query Account --output text)}"
ORIGINALS_BUCKET="${S3_ORIGINALS_BUCKET:-mini-jira-originals-${ACCOUNT}}"
RESIZED_BUCKET="${S3_RESIZED_BUCKET:-mini-jira-resized-${ACCOUNT}}"
TASKS_TABLE="${TABLE_PREFIX:-mini-jira-}Tasks"
FUNCTION_NAME="${IMAGE_RESIZE_FUNCTION_NAME:-mini-jira-image-resize}"
ROLE_NAME="${IMAGE_RESIZE_ROLE_NAME:-mini-jira-image-resize-role}"

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
LAMBDA_DIR="$ROOT/lambdas/image-resize"
ZIP_PATH="/tmp/mini-jira-image-resize.zip"

echo "Region: $REGION"
echo "Originals: $ORIGINALS_BUCKET"
echo "Resized: $RESIZED_BUCKET"
echo "Tasks table: $TASKS_TABLE"

ROLE_ARN="$(aws iam get-role --role-name "$ROLE_NAME" --query Role.Arn --output text 2>/dev/null || true)"
if [[ -z "${ROLE_ARN:-}" ]]; then
  echo "Creating IAM role $ROLE_NAME..."
  TRUST='{"Version":"2012-10-17","Statement":[{"Effect":"Allow","Principal":{"Service":"lambda.amazonaws.com"},"Action":"sts:AssumeRole"}]}'
  ROLE_ARN="$(aws iam create-role --role-name "$ROLE_NAME" --assume-role-policy-document "$TRUST" --query Role.Arn --output text)"
  aws iam attach-role-policy --role-name "$ROLE_NAME" \
    --policy-arn arn:aws:iam::aws:policy/service-role/AWSLambdaBasicExecutionRole
  POLICY_DOC="$(cat <<EOF
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": ["s3:GetObject"],
      "Resource": "arn:aws:s3:::${ORIGINALS_BUCKET}/*"
    },
    {
      "Effect": "Allow",
      "Action": ["s3:PutObject"],
      "Resource": "arn:aws:s3:::${RESIZED_BUCKET}/*"
    },
    {
      "Effect": "Allow",
      "Action": ["dynamodb:GetItem", "dynamodb:UpdateItem"],
      "Resource": "arn:aws:dynamodb:${REGION}:${ACCOUNT}:table/${TASKS_TABLE}"
    }
  ]
}
EOF
)"
  aws iam put-role-policy --role-name "$ROLE_NAME" --policy-name mini-jira-image-resize-inline --policy-document "$POLICY_DOC"
  echo "Waiting for IAM role propagation..."
  sleep 10
fi

echo "Installing Lambda dependencies (linux x64 for sharp)..."
cd "$LAMBDA_DIR"
rm -rf node_modules package-lock.json
npm install --omit=dev --platform=linux --arch=x64 --libc=glibc 2>/dev/null || npm install --omit=dev

echo "Packaging $ZIP_PATH..."
rm -f "$ZIP_PATH"
zip -rq "$ZIP_PATH" index.mjs package.json node_modules

if aws lambda get-function --function-name "$FUNCTION_NAME" --region "$REGION" >/dev/null 2>&1; then
  echo "Updating Lambda $FUNCTION_NAME..."
  aws lambda update-function-code --function-name "$FUNCTION_NAME" --zip-file "fileb://$ZIP_PATH" --region "$REGION" >/dev/null
  aws lambda wait function-updated --function-name "$FUNCTION_NAME" --region "$REGION"
  aws lambda update-function-configuration \
    --function-name "$FUNCTION_NAME" \
    --region "$REGION" \
    --runtime nodejs20.x \
    --handler index.handler \
    --timeout 30 \
    --memory-size 512 \
    --environment "Variables={TASKS_TABLE=${TASKS_TABLE},RESIZED_BUCKET=${RESIZED_BUCKET}}" >/dev/null
else
  echo "Creating Lambda $FUNCTION_NAME..."
  aws lambda create-function \
    --function-name "$FUNCTION_NAME" \
    --region "$REGION" \
    --runtime nodejs20.x \
    --role "$ROLE_ARN" \
    --handler index.handler \
    --zip-file "fileb://$ZIP_PATH" \
    --timeout 30 \
    --memory-size 512 \
    --environment "Variables={TASKS_TABLE=${TASKS_TABLE},RESIZED_BUCKET=${RESIZED_BUCKET}}" >/dev/null
  aws lambda wait function-active --function-name "$FUNCTION_NAME" --region "$REGION"
fi

LAMBDA_ARN="$(aws lambda get-function --function-name "$FUNCTION_NAME" --region "$REGION" --query Configuration.FunctionArn --output text)"

echo "Configuring S3 trigger on $ORIGINALS_BUCKET..."
aws lambda add-permission \
  --function-name "$FUNCTION_NAME" \
  --region "$REGION" \
  --statement-id s3-trigger-originals \
  --action lambda:InvokeFunction \
  --principal s3.amazonaws.com \
  --source-arn "arn:aws:s3:::${ORIGINALS_BUCKET}" \
  --source-account "$ACCOUNT" 2>/dev/null || true

NOTIFICATION="$(cat <<EOF
{
  "LambdaFunctionConfigurations": [
    {
      "Id": "mini-jira-image-resize",
      "LambdaFunctionArn": "${LAMBDA_ARN}",
      "Events": ["s3:ObjectCreated:*"],
      "Filter": {
        "Key": {
          "FilterRules": [
            { "Name": "prefix", "Value": "tasks/" }
          ]
        }
      }
    }
  ]
}
EOF
)"
aws s3api put-bucket-notification-configuration \
  --bucket "$ORIGINALS_BUCKET" \
  --notification-configuration "$NOTIFICATION" \
  --region "$REGION"

echo "Done. Lambda ARN: $LAMBDA_ARN"
