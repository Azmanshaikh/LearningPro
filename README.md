<div align="center">

<img src="assets/generated-icon.png" alt="EduAI Logo" width="96" />

# EduAI

AI-powered school management platform with tutoring, assessments, messaging, live classes, OCR grading, and role-based dashboards.

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)
[![Version](https://img.shields.io/badge/version-1.1.0-blue.svg)](docs/CHANGELOG.md)
[![Node.js](https://img.shields.io/badge/node-%3E%3D18-green.svg)](https://nodejs.org)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.x-3178C6.svg)](https://www.typescriptlang.org)
[![PRs Welcome](https://img.shields.io/badge/PRs-welcome-brightgreen.svg)](docs/CONTRIBUTING.md)

[Docs](docs/) · [Contributing](docs/CONTRIBUTING.md) · [Changelog](docs/CHANGELOG.md) · [License](LICENSE)

</div>

---

## Overview

EduAI is a full-stack platform built for schools, teachers, students, and parents. It combines:

- AI tutor and study support
- test creation, distribution, and grading
- OCR-based answer processing
- real-time messaging and collaboration
- live classroom integrations
- role-aware dashboards and onboarding workflows

## Core Features

### AI and Learning

- AI Tutor with markdown and math-friendly responses
- AI-generated tests and practice sets
- AI-assisted subjective answer evaluation
- study plan and performance insights

### School Operations

- role-based access: student, teacher, principal, school admin, platform admin, parent
- onboarding flow for school setup and invitations
- student directory and analytics dashboards
- tasks, notifications, and progress tracking

### Communication and Live Classes

- MessagePal real-time messaging (WebSocket)
- attachment uploads and history APIs
- Daily.co / BigBlueButton live class integrations

### Assessment Pipeline

- question banks and test assignments
- OCR scanning support for answer sheets
- rubric-based and AI-assisted scoring

---

## Tech Stack

| Layer | Technology |
| --- | --- |
| Frontend | React 18, Vite, TypeScript, Tailwind CSS, shadcn/ui |
| Backend | Node.js, Express, TypeScript, Zod |
| Auth | Firebase Authentication |
| Primary DB | MongoDB + Mongoose |
| Messaging Store | Cassandra (optional) |
| AI | OpenAI-compatible provider (OpenAI / Gemini) |
| OCR | Tesseract.js |
| Realtime | ws WebSockets |
| Infra | Docker, Kubernetes, Terraform |

---

## Repository Layout

```text
apps/
  api/            Express API, routes, services, tests
  web/            React web app
packages/
  shared/         Shared schemas and models
docs/             Project documentation
scripts/          Utility and setup scripts
k8s/              Kubernetes manifests
terraform/        Infrastructure as Code
```

---

## Quick Start

### Option 1: Docker

```bash
git clone <your-fork-or-repo-url>
cd LearningPro
cp .env.example .env
docker compose up
```

Open: http://localhost:5001

### Option 2: Local (single command)

Prerequisites:

- Node.js 18+
- MongoDB running locally or Atlas connection

```bash
git clone <your-fork-or-repo-url>
cd LearningPro
cp .env.example .env
npm install
npm run dev
```

Open: http://localhost:5001

### Option 3: Run API and Web separately

Backend (PowerShell):

```powershell
$env:SERVE_WEB="false"
$env:NODE_ENV="development"
npm run build:api
npx tsx apps/api/index.ts
```

Frontend (PowerShell):

```powershell
$env:VITE_API_URL="http://localhost:5001"
$env:VITE_WS_URL="ws://localhost:5001"
npm run build:web
npx vite preview --port 4173
```

---

## Environment Variables

Start from [.env.example](.env.example). Typical keys:

```env
# Required
MONGODB_URL=
VITE_FIREBASE_API_KEY=
VITE_FIREBASE_PROJECT_ID=
VITE_FIREBASE_APP_ID=
VITE_FIREBASE_MESSAGING_SENDER_ID=

# AI provider (set at least one)
OPENAI_API_KEY=
GOOGLE_API_KEY=

# Sessions and app base URL
SESSION_SECRET=
APP_URL=http://localhost:5001

# Optional
DAILY_API_KEY=
ASTRA_DB_APPLICATION_TOKEN=
ASTRA_DB_KEYSPACE=chat
```

---

## Development Commands

```bash
npm run dev            # API + web together
npm run build          # production build
npm run build:api      # backend build only
npm run build:web      # frontend build only
npm run check          # TypeScript check
npm run test           # backend tests
npm run lint           # ESLint
npm run format         # Prettier
```

---

## Documentation

- [Local Setup](docs/LOCAL_SETUP.md)
- [Database](docs/DATABASE.md)
- [Database Improvements](docs/DATABASE_IMPROVEMENTS.md)
- [Contributing](docs/CONTRIBUTING.md)
- [Changelog](docs/CHANGELOG.md)

---

## Contributing

1. Fork the repository
2. Create a branch: `git checkout -b feature/your-feature`
3. Commit with clear messages
4. Open a pull request

See [Contributing Guide](docs/CONTRIBUTING.md) for full workflow and standards.

---

## License

MIT. See [LICENSE](LICENSE).
