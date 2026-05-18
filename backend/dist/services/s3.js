import { GetObjectCommand, PutObjectCommand, S3Client } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { config } from '../config.js';
const s3 = new S3Client({ region: config.awsRegion });
export function getImagePublicUrl(key, bucket = config.s3.resizedBucket) {
    if (config.s3.publicUrl) {
        return `${config.s3.publicUrl.replace(/\/$/, '')}/${key}`;
    }
    return `https://${bucket}.s3.${config.awsRegion}.amazonaws.com/${key}`;
}
/** Presigned GET for private buckets (1 hour). */
export async function getImageViewUrl(key, bucket = config.s3.resizedBucket, expiresIn = 3600) {
    if (config.s3.publicUrl) {
        return getImagePublicUrl(key, bucket);
    }
    const command = new GetObjectCommand({ Bucket: bucket, Key: key });
    return getSignedUrl(s3, command, { expiresIn });
}
export async function getUploadPresignedUrl(key, contentType, expiresIn = 3600) {
    const command = new PutObjectCommand({
        Bucket: config.s3.originalsBucket,
        Key: key,
        ContentType: contentType,
    });
    return getSignedUrl(s3, command, { expiresIn });
}
