# E-SafetyRides
 
A platform that lets e-hailing riders search a driver and view their record history for heinous acts or behavior that could pose a safety risk — before getting in the car.
 
## Tech Stack
 
**Backend**
- Node.js + Express
- Firebase Admin SDK / Firestore
- Architecture: Route → Controller → Service (modular monolithic)
**Frontend**
- React (Vite)
## Project Structure
 
```
E-SafetyRides/
├── client/          # React frontend (Vite)
└── server/          # Express backend
    ├── config/      # Firebase config
    ├── middleware/  # Auth guards, rate limiting, etc.
    └── modules/     # Feature modules (auth, search, reports, admin, notifications)
        ├── auth/
        ├── search/
        ├── reports/
        ├── admin/
        └── notifications/
```
 
Each module follows Route → Controller → Service, so teammates can work on separate modules without conflicting.
 
## Getting Started
 
### 1. Clone the repo
 
```bash
git clone https://github.com/your-org/e-safetyrides.git
cd e-safetyrides
git checkout develop
```
 
### 2. Set up the server
 
```bash
cd server
npm install
```
 
Create a `.env` file in `/server` (see `.env.example` for the required keys). You'll need Firebase Admin SDK credentials:
- `FIREBASE_PROJECT_ID`
- `FIREBASE_CLIENT_EMAIL`
- `FIREBASE_PRIVATE_KEY`
Ask a team lead for access to the shared Firebase project, or for the service account key if you need to generate your own.
 
Run the server:
```bash
npm run dev
```
Server runs on `http://localhost:5000`.
 
### 3. Set up the client
 
```bash
cd client
npm install
npm run dev
```
Client runs on `http://localhost:5173`.
 
## Branching Workflow
 
- `main` — protected, stable branch. No direct pushes. Requires a reviewed pull request to merge.
- `develop` — active integration branch. Branch off this for feature work.
**To work on a feature:**
```bash
git checkout develop
git pull origin develop
git checkout -b feature/your-feature-name
```
 
When done, push your branch and open a PR into `develop`. Once `develop` is stable and tested, it gets PR'd into `main`.
 
## Commit Convention
 
We use [Conventional Commits](https://www.conventionalcommits.org/):
- `feat: add driver search endpoint`
- `fix: correct Firestore query filter`
- `chore: initialize client scaffold`
## Project Board
 
Sprint work is tracked via GitHub Issues, labeled by epic:
`epic:auth` · `epic:search` · `epic:reports` · `epic:admin` · `epic:notifications` · `epic:compliance`
 
See the **Projects** tab for the current sprint board.
 
## Notes on Data Handling
 
This app handles sensitive, identifiable personal data (driver records, reports of criminal/heinous conduct). Any work touching the `reports` or `search` modules should keep data privacy (POPIA compliance) and identity-verification concerns in mind — see the `epic:compliance` issues before building features that expose personal data.
