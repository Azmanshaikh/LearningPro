# Separated Web/API Architecture

This repository now uses a clearer application boundary:

```text
apps/
  api/
  web/
packages/
  shared/
```

## Intent

- `apps/web` owns browser UI, routing, presentation, and client-side state.
- `apps/api` owns HTTP APIs, WebSockets, persistence, integrations, and server-side tests.
- `packages/shared` owns schemas and shared domain types consumed by both.

This keeps the current monorepo development model intact while removing the old ambiguity of `client/`, `server/`, and `shared/` sitting directly at the repo root.

## Deployment Modes

### Combined deployment

- `SERVE_WEB=true` or unset
- API serves the Vite app in development and serves built static assets in production
- Existing root commands continue to work

### Split deployment

- Backend: deploy `apps/api` with `SERVE_WEB=false`
- Frontend: deploy the `vite build` output as static assets
- Configure:
  - `VITE_API_URL=https://api.example.com`
  - `VITE_WS_URL=wss://api.example.com` (optional; derived from `VITE_API_URL` if omitted)
  - `CORS_ORIGIN=https://app.example.com`

## Practical boundaries

- Browser code should call APIs through `apiUrl(...)` and sockets through `wsUrl(...)`.
- Shared schemas stay in `packages/shared` to avoid frontend/backend drift.
- Root scripts remain the compatibility surface for contributors and CI.
