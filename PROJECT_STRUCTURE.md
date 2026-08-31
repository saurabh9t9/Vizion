# Project Structure

```text
vizion/
├── README.md
├── PROJECT_STRUCTURE.md
├── EXPLAINATION.md
├── package.json
├── backend/
│   ├── .env                 # Local secrets and runtime configuration
│   ├── .env.example         # Safe configuration template
│   ├── .gitignore
│   ├── database.py          # MySQL connection and schema initialization
│   ├── main.py              # FastAPI application entry point
│   ├── openRouter_testing.py # Experimental model test script
│   ├── requirements.txt
│   ├── routes/
│   │   ├── auth.py          # Accounts, profile photos, password reset
│   │   ├── collaboration.py # Students, companies, projects, applications
│   │   ├── interview.py     # Live interview turns
│   │   ├── plan.py          # Interview options and plans
│   │   └── report.py        # Interview report generation
│   └── services/
│       ├── llm_client.py    # Gemini client and AI operations
│       └── practice_questions.py # AI practice-question endpoints
└── frontend/
    ├── eslint.config.js
    ├── index.html
    ├── package.json
    ├── vite.config.js
    ├── public/
    └── src/
        ├── App.jsx          # Application routes and interview state
        ├── App.css          # Legacy/shared application styles
        ├── api.js           # Axios API client functions
        ├── index.css        # Global CSS variables and reset
        ├── main.jsx         # React entry point
        ├── assets/          # Images, logos, and static assets
        ├── components/
        │   ├── about.jsx
        │   ├── AuthPage.jsx
        │   ├── CompanyDashboard.jsx
        │   ├── DashboardLayout.jsx
        │   ├── History.jsx
        │   ├── InterviewScreen.jsx
        │   ├── LandingScreen.jsx
        │   ├── OptionsScreen.jsx
        │   ├── PasswordResetPage.jsx
        │   ├── PlanConfirmation.jsx
        │   ├── ProfilePhotoPicker.jsx
        │   ├── ProtectedRoute.jsx
        │   ├── PublicOnlyRoute.jsx
        │   ├── ReportScreen.jsx
        │   ├── signals.jsx
        │   └── StudentDashboard.jsx
        └── styles/
            ├── App.css
            ├── Auth.css
            ├── CompanyDashboard.css
            ├── History.css
            ├── InfoPages.css
            ├── InterviewScreen.css
            ├── InterviewTheme.css
            ├── LandingScreen.css
            ├── OptionsScreen.css
            ├── PlanConfirmation.css
            ├── ReportScreen.css
            ├── StudentDashboard.css
            └── signals.css
```

## Runtime Flow

1. `main.jsx` mounts React and loads global styles.
2. `App.jsx` selects the page from the browser route.
3. `AuthPage.jsx` stores the logged-in user in `localStorage`.
4. Protected routes render either the student or company workspace.
5. Students start at `LandingScreen`, choose an interview approach in `OptionsScreen`, confirm a plan in `PlanConfirmation`, complete the session in `InterviewScreen`, and review the result in `ReportScreen` or `History`.
6. Dashboard components use `api.js` to communicate with FastAPI.
7. FastAPI routes call `database.py` for MySQL data and `services/llm_client.py` for Gemini operations.

Generated or local-only directories include `backend/.venv`, Python cache directories, `frontend/node_modules`, and `frontend/dist`.
