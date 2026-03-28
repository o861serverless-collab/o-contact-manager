# Self-hosted Contact Manager

> ~30,000 contacts | Firebase Firestore + Realtime Database + REST API

See [docs/database-architecture.md](docs/database-architecture.md) for full architecture.
See [project_task.md](project_task.md) for task status.
See [CHANGE_LOGS_USER.md](CHANGE_LOGS_USER.md) for changelog.

## Quick start
```bash
npm install
cp .env.example .env   # fill in FIREBASE_PROJECT_ID + service account path
npm run deploy:rules   # deploy firestore rules + indexes
npm run dev            # start dev server
```
