import { PutObjectCommand, S3Client } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { getEnv } from './env.js';

export type SignedUploadKind = 'plant' | 'scan' | 'listing' | 'profile';

export type SignedUpload = {
  uploadUrl: string;
  downloadUrl: string;
  expiresAt: number;
};

const FIFTEEN_MIN_S = 15 * 60;

let cachedClient: S3Client | null = null;

function s3(): S3Client {
  if (cachedClient) return cachedClient;
  const env = getEnv();
  cachedClient = new S3Client({
    region: env.AWS_REGION,
    ...(env.AWS_ACCESS_KEY_ID && env.AWS_SECRET_ACCESS_KEY
      ? {
          credentials: {
            accessKeyId: env.AWS_ACCESS_KEY_ID,
            secretAccessKey: env.AWS_SECRET_ACCESS_KEY
          }
        }
      : {})
  });
  return cachedClient;
}

function objectKey(uid: string, kind: SignedUploadKind, refId: string): string {
  if (kind === 'profile') return `users/${uid}/profile.jpg`;
  return `users/${uid}/${kind}s/${refId}.jpg`;
}

function publicUrl(key: string): string {
  const env = getEnv();
  // virtual-hosted-style URL; Cloudfront can sit in front later
  return `https://${env.S3_BUCKET}.s3.${env.AWS_REGION}.amazonaws.com/${key}`;
}

export async function mintSignedUpload(
  uid: string,
  kind: SignedUploadKind,
  refId?: string,
  contentType = 'image/jpeg'
): Promise<SignedUpload> {
  const env = getEnv();
  const id = refId ?? `${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
  const key = objectKey(uid, kind, id);

  const cmd = new PutObjectCommand({
    Bucket: env.S3_BUCKET,
    Key: key,
    ContentType: contentType
  });
  const uploadUrl = await getSignedUrl(s3(), cmd, { expiresIn: FIFTEEN_MIN_S });
  const expiresAt = Date.now() + FIFTEEN_MIN_S * 1000;

  return {
    uploadUrl,
    downloadUrl: publicUrl(key),
    expiresAt
  };
}
