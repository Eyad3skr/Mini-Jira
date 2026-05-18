import { PutObjectCommand, S3Client } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { config } from '../config.js';
const s3 = new S3Client({ region: config.awsRegion });
export function getImagePublicUrl(key, bucket = config.s3.resizedBucket) {
    if (config.s3.publicUrl) {
        return `${config.s3.publicUrl.replace(/\/$/, '')}/${key}`;
    }
    return `https://${bucket}.s3.${config.awsRegion}.amazonaws.com/${key}`;
}
export async function getUploadPresignedUrl(key, contentType, expiresIn = 3600) {
    const command = new PutObjectCommand({
        Bucket: config.s3.originalsBucket,
        Key: key,
        ContentType: contentType,
    });
    return getSignedUrl(s3, command, { expiresIn });
}
