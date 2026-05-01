import { cert, getApps, initializeApp, type App } from 'firebase-admin/app';
import { getAuth, type Auth } from 'firebase-admin/auth';
import { getStorage, type Storage } from 'firebase-admin/storage';
import { env } from './env.js';

let app: App | null = null;

export function adminApp(): App {
  if (app) return app;
  if (getApps().length > 0) {
    app = getApps()[0]!;
    return app;
  }
  const json = JSON.parse(
    Buffer.from(env.FIREBASE_SERVICE_ACCOUNT, 'base64').toString('utf8')
  );
  app = initializeApp({
    credential: cert(json),
    storageBucket: env.FIREBASE_STORAGE_BUCKET
  });
  return app;
}

export function adminAuth(): Auth {
  return getAuth(adminApp());
}

export function adminStorage(): Storage {
  return getStorage(adminApp());
}
