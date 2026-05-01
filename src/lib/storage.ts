import { adminStorage } from './firebaseAdmin.js';

export type SignedUploadKind = 'plant' | 'scan' | 'listing' | 'profile';

export type SignedUpload = {
  uploadUrl: string;
  downloadUrl: string;
  expiresAt: number;
};

const FIFTEEN_MIN_MS = 15 * 60 * 1000;

export async function mintSignedUpload(
  uid: string,
  kind: SignedUploadKind,
  refId?: string,
  contentType = 'image/jpeg'
): Promise<SignedUpload> {
  const id = refId ?? `${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
  const path =
    kind === 'profile'
      ? `users/${uid}/profile.jpg`
      : `users/${uid}/${kind}s/${id}.jpg`;

  const file = adminStorage().bucket().file(path);
  const expiresAt = Date.now() + FIFTEEN_MIN_MS;

  const [uploadUrl] = await file.getSignedUrl({
    version: 'v4',
    action: 'write',
    expires: expiresAt,
    contentType
  });
  const [downloadUrl] = await file.getSignedUrl({
    version: 'v4',
    action: 'read',
    expires: Date.now() + 365 * 24 * 60 * 60 * 1000
  });

  return { uploadUrl, downloadUrl, expiresAt };
}
