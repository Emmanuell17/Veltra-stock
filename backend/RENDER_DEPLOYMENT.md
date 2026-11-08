# Render Deployment Guide

The backend only serves the AI assistant; inventory data lives in Firestore, so no database is needed on Render.

## Step 1: Create the Web Service

Either deploy the [`render.yaml`](../render.yaml) blueprint, or create a **Web Service** manually:

- **Root Directory**: `backend` (important!)
- **Runtime**: `Node` (22 or newer, pinned via `engines` in `package.json`)
- **Build Command**: `npm install`
- **Start Command**: `npm start`

## Step 2: Set Environment Variables

In the service's **Environment** settings:

```
NODE_ENV=production
FIREBASE_PROJECT_ID=<your Firebase project ID>
GEMINI_API_KEY=<your Google AI Studio key>
```

Optional:

```
GEMINI_MODEL=gemini-2.5-flash
FRONTEND_URL=https://your-custom-domain.com   # *.vercel.app is allowed automatically
```

`FIREBASE_PROJECT_ID` must match `REACT_APP_FIREBASE_PROJECT_ID` in the frontend. The backend uses it to verify the Firebase sign-in token sent with every assistant request; no service account key is required. Render sets `PORT` itself.

## Step 3: Verify

1. The logs should show `Server is running on port ...` and no warnings about missing `FIREBASE_PROJECT_ID` or `GEMINI_API_KEY`.
2. `curl https://your-backend.onrender.com/api/health` should return `{"status":"ok","message":"Server is running"}`.
3. Set `REACT_APP_API_URL=https://your-backend.onrender.com` on the frontend (Vercel) and redeploy it.

## Troubleshooting

- **401 "Sign in required" / "Your session has expired"**: the request had no valid Firebase ID token. Sign out and back in; check that the frontend and backend use the same Firebase project.
- **503 "Server auth is not configured"**: `FIREBASE_PROJECT_ID` is not set.
- **503 "AI assistant is not configured"**: `GEMINI_API_KEY` is not set.
- **CORS errors**: add your frontend's origin as `FRONTEND_URL`.
