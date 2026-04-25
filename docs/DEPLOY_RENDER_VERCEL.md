# Render + Vercel Deployment

This repository is set up for:

- `apps/api` on Render
- `apps/web` on Vercel

## 1. Backend on Render

Use the included [render.yaml](../render.yaml) blueprint or create the service manually.

### Render service settings

- Service type: `Web Service`
- Runtime: `Node`
- Build command: `npm install --include=dev && npm run build:api`
- Start command: `npm start`
- Health check path: `/api/health`

The app already binds to `process.env.PORT`, which matches Render's web service requirements. Render also supports WebSocket connections for web services.

### Required Render environment variables

Set these in the Render dashboard:

- `SERVE_WEB=false`
- `CORS_ORIGIN=https://your-frontend-domain.vercel.app`
- `SESSION_SECRET=...`
- `MONGODB_URL=...`
- `OPENAI_API_KEY=...` if you use AI features
- `FIREBASE_SERVICE_ACCOUNT_JSON=...` if you use Firebase auth
- SMTP, Cassandra, Daily, and other optional integrations as needed

After the first deploy, note the backend URL, for example:

`https://learningpro-api.onrender.com`

## 2. Frontend on Vercel

Create a Vercel project from this same repository.

### Vercel project settings

- Root Directory: repository root
- Framework Preset: `Vite`
- Build Command: `npm run build:web`
- Output Directory: `dist/public`

The included [vercel.json](../vercel.json) rewrites all unmatched routes to `index.html`, which keeps client-side routing working for the SPA.

### Required Vercel environment variables

Set these in Vercel for Production and Preview:

- `VITE_API_URL=https://learningpro-api.onrender.com`
- `VITE_WS_URL=wss://learningpro-api.onrender.com`
- `VITE_FIREBASE_API_KEY=...`
- `VITE_FIREBASE_PROJECT_ID=...`
- `VITE_FIREBASE_APP_ID=...`
- `VITE_FIREBASE_MESSAGING_SENDER_ID=...`
- `VITE_FIREBASE_MEASUREMENT_ID=...`

Redeploy after changing variables.

## 3. CORS and custom domains

If you later add a custom frontend domain, update Render:

- `CORS_ORIGIN=https://app.yourdomain.com`

If you use both preview and production frontends, either:

- allow both domains in `CORS_ORIGIN`, comma-separated, or
- keep preview auth/features limited if cross-origin session behavior becomes an issue

## 4. WebSockets

This app uses WebSockets for chat/message features.

- Frontend should use `VITE_WS_URL` with `wss://...`
- Render Web Services support inbound WebSocket connections

## 5. Deploy order

1. Deploy Render first
2. Copy the Render URL
3. Set Vercel `VITE_API_URL` and `VITE_WS_URL`
4. Deploy Vercel
5. Update Render `CORS_ORIGIN` if you switch to a custom Vercel domain
