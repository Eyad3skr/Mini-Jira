import { GetObjectCommand, PutObjectCommand, S3Client } from '@aws-sdk/client-s3';
import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient, GetCommand, UpdateCommand } from '@aws-sdk/lib-dynamodb';
import sharp from 'sharp';

const s3 = new S3Client({});
const ddb = DynamoDBDocumentClient.from(new DynamoDBClient({}));
const TASKS_TABLE = process.env.TASKS_TABLE;
const RESIZED_BUCKET = process.env.RESIZED_BUCKET;

export const handler = async (event) => {
  for (const record of event.Records ?? []) {
    const bucket = record.s3.bucket.name;
    const key = decodeURIComponent(record.s3.object.key.replace(/\+/g, ' '));

    const match = key.match(/^tasks\/([^/]+)\/v(\d+)\//);
    if (!match) continue;

    const [, taskId, version] = match;
    const obj = await s3.send(new GetObjectCommand({ Bucket: bucket, Key: key }));
    const body = await obj.Body.transformToByteArray();
    const resized = await sharp(Buffer.from(body)).resize(400, 400, { fit: 'inside' }).jpeg({ quality: 80 }).toBuffer();

    const resizedKey = key.replace('/v', '/resized/v').replace(/\.[^.]+$/, '.jpg');
    await s3.send(
      new PutObjectCommand({
        Bucket: RESIZED_BUCKET,
        Key: resizedKey,
        Body: resized,
        ContentType: 'image/jpeg',
      })
    );

    const task = await ddb.send(new GetCommand({ TableName: TASKS_TABLE, Key: { taskId } }));
    if (!task.Item) continue;

    const imageKeys = (task.Item.imageKeys ?? []).map((img) =>
      img.version === parseInt(version, 10) ? { ...img, resizedKey } : img
    );
    await ddb.send(
      new UpdateCommand({
        TableName: TASKS_TABLE,
        Key: { taskId },
        UpdateExpression: 'SET imageKeys = :keys, updatedAt = :now',
        ExpressionAttributeValues: { ':keys': imageKeys, ':now': new Date().toISOString() },
      })
    );
  }
  return { statusCode: 200 };
};
