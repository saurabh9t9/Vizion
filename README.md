# VIZION

VIZION is an AI-powered interview and collaboration platform. Students can generate adaptive mock interviews, practice coding, review reports, build project portfolios, discover company challenges, and apply to them. Companies can publish practical problem statements, discover students, and review applications.

## Features

- Adaptive AI mock interviews with role-specific plans
- Live interviewer follow-up questions
- Browser camera, microphone, speech, and code-editor support
- Interview reports with scores, competencies, strengths, concerns, and recommendations
- Browser-based interview history with individual, batch, and full deletion
- AI-generated coding practice and code evaluation
- Student profiles with interests, skills, profile photos, and GitHub projects
- Company profiles with profile photos and published briefs
- Company discovery and filtering by name, skill, and interest
- Student applications with undo/withdraw support
- Gmail OTP password reset

## Architecture

- Frontend: React 19, Vite, React Router, Axios, Monaco Editor, Lucide icons, Motion, and face-api.js
- Backend: FastAPI, Pydantic, MySQL Connector, Google Gemini SDK, and Uvicorn
- Storage: MySQL for accounts and collaboration data; browser `localStorage` for interview history and generated practice topics

## Requirements

- Windows, macOS, or Linux
- Python 3.10+
- Node.js 18+
- MySQL 8+
- A Gemini API key for AI features
- A Gmail account with a Google App Password for OTP email delivery

## Setup

### 1. Configure the backend

```powershell
cd backend
python -m venv .venv
.\.venv\Scripts\Activate.ps1
pip install -r requirements.txt
```

Create or update `backend/.env`:

```env
GEMINI_API_KEY=your-gemini-api-key
GEMINI_MODEL=gemini-3.5-flash-lite

DB_HOST=127.0.0.1
DB_PORT=3306
DB_USER=root
DB_PASSWORD=your-mysql-password
DB_NAME=vizion

GMAIL_ADDRESS=your-gmail-address@gmail.com
GMAIL_APP_PASSWORD=your-16-character-google-app-password
```

Use a Google-generated App Password, not the regular Gmail password. The Gmail address and App Password must belong to the same Google account.

Make sure MySQL is running, then start the API:

```powershell
uvicorn main:app --reload
```

The backend runs at `http://localhost:8000`.

### 2. Start the frontend

Open another terminal:

```powershell
cd frontend
npm install
npm run dev
```

The frontend runs at `http://localhost:5173`.

## Useful Commands

```powershell
cd frontend
npm run dev
npm run build
npm run lint
```

```powershell
cd backend
python -m compileall -q routes database.py
```

## Main Routes

- `/login`: student/company login
- `/register`: account creation
- `/reset-password`: Gmail OTP password reset
- `/student-dashboard`: student workspace
- `/company-dashboard`: company workspace
- `/mock-interview`: AI interview workflow

## Notes

- Start MySQL before starting FastAPI. Database initialization runs during application startup.
- Interview history and generated practice topics are stored in the current browser only.
- Camera, microphone, speech, geolocation, Open-Meteo, and Nominatim features depend on browser permissions or external services.
- Authentication currently uses `localStorage` on the frontend and does not use server-issued sessions or JWT tokens.
- `backend/openRouter_testing.py` is an experimental script and should not be used in production. Its API key should be revoked and moved to environment configuration.

See [PROJECT_STRUCTURE.md](PROJECT_STRUCTURE.md) for the directory map and [EXPLAINATION.md](EXPLAINATION.md) for a file-by-file explanation.
