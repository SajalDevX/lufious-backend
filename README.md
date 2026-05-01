# lufious-backend

Node.js HTTP backend for the Lufious Android app.

- **Stack:** Hono + TypeScript + MongoDB Atlas + Firebase Admin
- **Auth:** Firebase Auth idToken Bearer (verified by `firebase-admin`)
- **Host:** TBD (Heroku / AWS / Azure). Plain `node server.js` — host-agnostic.

## Quickstart

```bash
cp .env.example .env
# fill MONGODB_URI, FIREBASE_SERVICE_ACCOUNT (base64 of service account JSON), FIREBASE_STORAGE_BUCKET
npm install
npm run dev
# -> http://localhost:3000
curl http://localhost:3000/api/health
```

## Scripts

| Command | Purpose |
|---|---|
| `npm run dev` | tsx watch mode |
| `npm run build` | tsc → `dist/` |
| `npm start` | run `dist/server.js` |
| `npm test` | vitest |
| `npm run lint` | eslint |

## Endpoints (Phase 1)

| Method | Path | Auth |
|---|---|---|
| GET | `/api/health` | — |
| POST | `/api/auth/sync` | Bearer |

More routes ship per phase — see `/home/sajal/.claude/plans/okay-now-we-need-starry-teacup.md`.

## Env

See `.env.example`. `FIREBASE_SERVICE_ACCOUNT` must be base64-encoded JSON:

```bash
base64 -w0 service-account.json
```

## Layout

```
src/
  server.ts          # Hono entry
  lib/               # mongo, firebaseAdmin, env
  middleware/        # auth, errors
  routes/            # one file per resource
  schemas/           # Zod
  services/          # business logic
test/                # vitest
```
