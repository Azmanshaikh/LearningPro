<div align="center">

<img src="assets/generated-icon.png" alt="EduAI Logo" width="96" />

# EduAI

**AI-powered school operations and student learning in one platform.**

EduAI is our vision for a school system that does more than store records. It should help students learn better, help teachers act faster, and help schools run with less friction. This repository contains the current web platform and API for that vision.

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)
[![Version](https://img.shields.io/badge/version-1.1.0-blue.svg)](docs/CHANGELOG.md)
[![Node.js](https://img.shields.io/badge/node-%3E%3D18-green.svg)](https://nodejs.org)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.x-3178C6.svg)](https://www.typescriptlang.org)
[![Docker](https://img.shields.io/badge/docker-ready-blue.svg)](Dockerfile)

</div>

## Vision
We are building EduAI as a practical operating system for schools:

- Students should get instant academic support, guided revision, and clear progress feedback.
- Teachers should be able to create, review, communicate, and run classes from one place.
- School leaders should get visibility into performance, operations, and onboarding without juggling separate tools.
- AI should be useful, grounded, and integrated into actual school workflows, not just added as a demo feature.

## Current Status
This repo is active and usable, but it is not feature-complete. Several important workflows are already implemented and working. Some pages and modules are still placeholders or early-stage integrations.

## What Is Working Now
### Core Platform
- Role-based authentication and routing for `student`, `teacher`, `parent`, `principal`, `school_admin`, and `admin`
- Firebase-based auth flow plus backend profile sync
- Student, teacher, principal, school admin, admin, and parent dashboards
- Onboarding and invite flow endpoints for school setup and user lifecycle

### AI Features
- AI Tutor chat at `/ai-tutor`
- Gemini-backed tutor responses from `POST /api/ai-chat`
- PDF summarizer in AI Tutor via `POST /api/ai/pdf-summary`
- AI-generated test questions
- AI subjective answer evaluation
- AI study plan generation
- AI performance analysis

### Assessment and Learning
- Test creation, listing, assignment, attempts, and answer submission
- OCR processing routes for scanned content
- Student weak-subject detection
- Focus sessions tracking
- Student analytics endpoints

### Messaging and Real-Time
- WebSocket chat server at `/ws/chat`
- MessagePal messaging routes and websocket support
- Channel/workspace messaging flows
- File upload support via `/api/upload`
- Read, pin, grading, unread, and DM flows

### School Operations
- Tasks and notifications APIs
- Live classes APIs
- Calendar and dashboard views in the web app
- Settings, achievements, progress, and focus mode pages

### Infrastructure
- Docker support
- Render deployment config
- TypeScript, ESLint, Prettier, and Vitest setup
- Shared schema package under `packages/shared`

## Coming Soon
These areas are present as placeholders, partial flows, or next-step roadmap items:

- Real RAG pipeline for tutor chat
  Current tutor chat is AI chat, not retrieval-backed question answering.
- Source-grounded citations in tutor responses
- Dedicated resources and study group experiences
- Institution, staff, students, infrastructure, system settings, users, classes, partners, children, meetings, reports, and test-results modules
- More complete AI classroom flows and deeper classroom-generation tooling
- Better production documentation cleanup and product walkthrough assets

## Product Notes
### AI Tutor
The current AI Tutor supports:

- subject-aware chat
- PDF upload and summarization
- discuss-summary-in-chat flow
- markdown-style tutor output

It does **not** yet have:

- vector search
- embeddings-based retrieval
- long-term document knowledge base
- citation-backed RAG answers

### AI Provider
The main app AI routes currently use **Gemini**. Some older docs in the repo still mention OpenAI, but the active tutor and summarizer flow are Gemini-backed in the current code.

## Tech Stack
| Layer | Technology |
|---|---|
| Web App | React 18, Vite, TypeScript, Tailwind CSS, shadcn/ui, Framer Motion |
| API | Node.js, Express, TypeScript, Zod |
| Auth | Firebase Authentication + Firebase Admin |
| Primary Database | MongoDB + Mongoose |
| Messaging Store | Cassandra support for MessagePal |
| AI | Gemini API |
| OCR | Tesseract.js |
| Real-time | WebSockets (`ws`) |
| Email | Nodemailer |
| Video | Daily.co / BigBlueButton integrations |
| Infra | Docker, Kubernetes, Terraform, Render |

## Repository Structure
```text
apps/
  api/        Express API, websocket servers, backend tests
  web/        React + Vite web application

packages/
  shared/     Shared schemas and models

services/
  iniclaw/    Supporting service/integration code

docs/         Setup, architecture, and project notes
scripts/      Seed, setup, and utility scripts
k8s/          Kubernetes manifests
terraform/    Infrastructure as code
```

## Key Routes
### Web
- `/ai-tutor`
- `/dashboard`
- `/student-dashboard`
- `/principal-dashboard`
- `/school-admin-dashboard`
- `/admin-dashboard`
- `/messages`
- `/analytics`
- `/live-classes`
- `/ocr-scan`
- `/tasks`
- `/notifications`
- `/focus`
- `/achievements`

### API
- `POST /api/ai-chat`
- `POST /api/ai/pdf-summary`
- `POST /api/ai/generate-test`
- `POST /api/ai/study-plan`
- `POST /api/ai/performance-analysis`
- `POST /api/evaluate`
- `POST /api/ocr`
- `POST /api/upload`
- `GET /api/health`

## Quick Start
### Local Development
```bash
git clone https://github.com/StarkNitish/PersonalLearningPro.git
cd PersonalLearningPro
cp .env.example .env
npm install
npm run dev
```

Open `http://localhost:5001`

### Docker
```bash
git clone https://github.com/StarkNitish/PersonalLearningPro.git
cd PersonalLearningPro
cp .env.example .env
docker compose up
```

## Environment
Minimum useful local setup:

```env
MONGODB_URL=mongodb://localhost:27017/eduai

VITE_FIREBASE_API_KEY=
VITE_FIREBASE_PROJECT_ID=
VITE_FIREBASE_APP_ID=
VITE_FIREBASE_MESSAGING_SENDER_ID=
VITE_FIREBASE_MEASUREMENT_ID=
FIREBASE_SERVICE_ACCOUNT_JSON=

GEMINI_API_KEY=
GEMINI_MODEL=gemini-2.5-flash

SESSION_SECRET=
APP_URL=http://localhost:5001
```

Optional aliases and related vars:

```env
GOOGLE_API_KEY=
GEMINI_CHAT_MODEL=gemini-2.5-flash
GEMINI_EVALUATION_MODEL=gemini-2.5-flash
GEMINI_STUDY_PLAN_MODEL=gemini-2.5-flash
GEMINI_ANALYSIS_MODEL=gemini-2.5-flash
START_MESSAGEPAL_HTTP=false
```

See [`.env.example`](.env.example) for the fuller template.

## Development Commands
| Command | Description |
|---|---|
| `npm run dev` | Start the API in dev mode and serve the web app |
| `npm run build` | Build web and API for production |
| `npm run build:web` | Build frontend only |
| `npm run build:api` | Build backend only |
| `npm start` | Run the production build |
| `npm run check` | TypeScript type check |
| `npm test` | Run backend Vitest suite |
| `npm run lint` | Run ESLint |
| `npm run format` | Run Prettier |

## Deployment Notes
- Production API needs a valid `GEMINI_API_KEY`
- Production should set `SESSION_SECRET`
- Render/web deployments should keep `START_MESSAGEPAL_HTTP=false`
- If you split frontend and backend hosting, configure `VITE_API_URL` and `VITE_WS_URL`

## Documentation
- [Local Setup](docs/LOCAL_SETUP.md)
- [Database Architecture](docs/DATABASE.md)
- [Database Improvements](docs/DATABASE_IMPROVEMENTS.md)
- [Contributing](docs/CONTRIBUTING.md)
- [Changelog](docs/CHANGELOG.md)

## Contributing
1. Fork the repo
2. Create a branch
3. Make your changes
4. Run `npm run check`
5. Open a PR

## License
MIT. See [LICENSE](LICENSE).
