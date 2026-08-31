# VIZION File Explanation

This document explains the purpose of every application source and configuration file currently in the repository.

## Root Files

### `package.json`

The root Node package manifest. It currently declares the root-level `react-router-dom` dependency. The runnable frontend has its own package manifest in `frontend/package.json`.

### `README.md`

Project overview, features, prerequisites, environment setup, run commands, routes, and operational notes.

### `PROJECT_STRUCTURE.md`

Directory map and a high-level description of how the frontend and backend work together.

## Backend

### `backend/main.py`

Creates the FastAPI application, enables CORS for local frontend origins, registers the authentication, collaboration, interview, plan, report, and practice routers, and runs database initialization during startup. It also exposes the health/root endpoints defined in the file.

### `backend/database.py`

Provides the MySQL persistence layer.

- `Database.__init__()` stores the raw MySQL connection.
- `Database.execute()` executes one parameterized query and adapts the repository's `?` placeholders to MySQL placeholders.
- `Database.executemany()` executes a query for multiple parameter sets.
- `Database.executescript()` executes the schema setup statements.
- `Database.__enter__()` and `Database.__exit__()` provide transaction context management, committing on success and rolling back on errors.
- `create_database()` creates the configured database if it does not exist.
- `connection()` opens a database connection.
- `initialize()` creates the tables, applies legacy column migrations, removes selected seed records, and seeds practice problems.

Tables are `users`, `login_events`, `password_reset_otps`, `projects`, `company_problems`, `applications`, `practice_problems`, and `practice_attempts`.

### `backend/routes/auth.py`

Owns account and password operations.

Models include `RegisterRequest`, `LoginRequest`, `DeleteAccountRequest`, `ProfilePhotoRequest`, `PasswordResetRequest`, `PasswordResetVerifyRequest`, and `PasswordResetCompleteRequest`.

- `validate_role()` accepts only `student` or `company`.
- `normalize_email()` trims, lowercases, and validates email input.
- `hash_password()` creates a salted PBKDF2-SHA256 password hash.
- `verify_password()` checks a password against the stored hash.
- `public_user()` returns safe account fields for the frontend.
- `otp_hash()` hashes a reset code before database storage.
- `send_reset_email()` sends a Gmail SMTP OTP message.
- `validate_reset_code()` checks reset-code expiry, attempt limits, role, and hash equality.

Endpoints:

- `POST /register` creates an account and first login event.
- `POST /login` authenticates an account and records a login event.
- `PUT /account/profile-photo` saves or removes a base64 profile photo.
- `POST /password-reset/request` creates a ten-minute six-digit OTP and emails it.
- `POST /password-reset/verify` validates an OTP.
- `POST /password-reset/complete` changes the password and consumes the OTP.
- `DELETE /account` verifies credentials and permanently deletes the account.

### `backend/routes/collaboration.py`

Implements student/company collaboration and practice persistence.

Request models are `ProjectRequest`, `ApplicationRequest`, `PracticeEvaluationRequest`, `ProfileRequest`, and `CompanyProblemRequest`.

- `problem_from_row()` converts a database brief row into an API brief and splits skills.
- `project_from_row()` converts a project row and serializes its timestamp.
- `get_profile()` returns a student's profile and project count.
- `update_profile()` saves student interests and skills.
- `submit_project()` validates and creates a GitHub project.
- `get_projects()` lists a student's projects.
- `delete_project()` deletes a student's project.
- `get_company_problems()` lists public briefs with company profile photos.
- `post_company_problem()` creates a company brief.
- `delete_company_problem()` deletes a company brief and its applications.
- `get_students()` filters and returns student directory entries, including project lists and photos.
- `apply_to_problem()` creates a unique student application.
- `get_applications()` returns applications for a student or company, including student profile and project data.
- `withdraw_application()` removes a student's application.
- `get_practice_problems()` returns seeded practice problems.
- `evaluate_practice()` scores a practice submission using the local heuristic path.
- `get_student_stats()` calculates login streak, average score, project count, and application count.
- `get_competencies()` calculates or reads student competency values.

### `backend/routes/plan.py`

Generates interview choices and structured plans.

- `OptionsRequest`, `InterviewOption`, `OptionsResponse`, `PlanRequest`, `InterviewMetadata`, `PreparedQuestion`, `SegmentResponse`, and `PlanResponse` define request/response contracts.
- `generate_options()` calls the LLM to produce interview strategy options.
- `generate_plan()` creates the selected role-specific interview plan.

Endpoints are `POST /api/generate-options` and `POST /api/generate-plan`.

### `backend/routes/interview.py`

Owns the live interview turn contract.

- `TranscriptEntry` represents a transcript message.
- `InterviewTurnRequest` validates current plan, transcript, editor state, engagement, and code context.
- `InterviewTurnResponse` describes the next interviewer response and state transitions.
- `interview_turn()` calls the LLM and returns the next question, follow-up decision, editor mode, and segment progress.

Endpoint: `POST /api/interview-turn`.

### `backend/routes/report.py`

Generates final interview reports.

Models include `EngagementEntry`, `CodeSnapshot`, `TranscriptEntry`, `TechnicalMetrics`, `CommunicationMetrics`, `SegmentReport`, `ReportResponse`, and `ReportRequest`.

- `generate_report()` sends interview evidence to the LLM and returns normalized scores, competencies, strengths, concerns, recommendations, and segment details.

Endpoint: `POST /api/generate-report`.

### `backend/services/llm_client.py`

Central Gemini client and AI behavior layer.

- `_require_client()` ensures the Gemini API key is configured.
- `_resolve_model_name()` resolves the configured Gemini model.
- `_generate_content()` sends Gemini requests with retry handling.
- `_clean_json_response()`, `_repair_invalid_json()`, `_extract_json()`, and `_parse_json_response()` clean and parse model JSON.
- `generate_interview_options()` generates adaptive interview formats.
- `generate_interview_plan()` builds role-specific segments and questions.
- `get_interviewer_response()` controls live follow-ups, question progression, editor mode, and segment changes.
- `generate_report()` evaluates interview evidence and produces a report.
- `check_gemini_configuration()` reports AI configuration state.

### `backend/services/practice_questions.py`

Provides the Gemini-based practice-question API.

- `TopicRequest` validates a requested practice topic.
- `EvaluationRequest` validates submitted code and language.
- `parse_json_response()` parses model output.
- `generate_practice()` generates three coding questions.
- `evaluate_practice()` evaluates submitted code.
- `practice_test()` reports router and Gemini status.

### `backend/openRouter_testing.py`

An experimental interactive model test script.

- `test_model()` prompts for input and sends it to an OpenRouter model.

It is separate from the application runtime and currently contains a hard-coded API key and an undeclared OpenAI dependency. It should not be used in production.

### `backend/requirements.txt`

Pins the Python dependencies: FastAPI, Uvicorn, Google GenAI, python-dotenv, Pydantic, pydantic-settings, and MySQL Connector.

### `backend/.env`

Local runtime configuration. It contains database settings, Gemini settings, and Gmail SMTP settings. Secret values must remain local and must not be committed.

- `GEMINI_API_KEY`: Gemini credential.
- `GEMINI_MODEL`: model name used by AI services.
- `DB_HOST`, `DB_PORT`, `DB_USER`, `DB_PASSWORD`, `DB_NAME`: MySQL connection settings.
- `GMAIL_ADDRESS`: Gmail SMTP sender.
- `GMAIL_APP_PASSWORD`: Google-generated App Password used for OTP delivery.

### `backend/.env.example`

Safe template showing the required environment variable names without real secrets.

### `backend/.gitignore`

Lists backend-local files that should not be committed, such as virtual environments, caches, local databases, and environment files.

### `backend/vizion.db`

A local database artifact present in the workspace. The active application code is configured for MySQL through `database.py`.

## Frontend Entry And Routing

### `frontend/src/main.jsx`

Mounts the React application under `StrictMode` and loads global styles before rendering `App`.

### `frontend/index.html`

Vite's HTML entry document. It provides the root element into which React mounts the application and defines the document metadata.

### `frontend/vite.config.js`

Vite configuration for the React development server and production bundler.

### `frontend/eslint.config.js`

ESLint configuration for checking JavaScript and JSX source files.

### `frontend/public/`

Static files served directly by Vite without being imported through the React bundle.

### `frontend/src/App.jsx`

Contains the top-level interview state machine and browser routes.

- `InterviewWorkspace()` manages landing, options, plan, interview, report, loading/errors, current session data, and browser interview history.
- `MockInterviewPage()` renders the interview workspace.
- `App()` reads the saved user, defines public/protected routes, and redirects `/` and unknown paths.

Routes include `/login`, `/register`, `/reset-password`, `/student-dashboard/*`, `/mock-interview`, `/company-dashboard`, `/`, and the wildcard login fallback.

### `frontend/src/api.js`

Creates the Axios client pointed at `http://localhost:8000` and exports request helpers for authentication, password reset, profile photos, projects, applications, student data, company briefs, practice, and AI interview operations.

## Frontend Components

### `frontend/src/components/AuthPage.jsx`

`AuthPage` handles login and registration, student/company role selection, form validation, local user persistence, error messages, and dashboard navigation.

### `frontend/src/components/PasswordResetPage.jsx`

`PasswordResetPage` implements the three-step reset flow: request an OTP, verify the OTP, and submit a new password.

### `frontend/src/components/ProtectedRoute.jsx`

`ProtectedRoute` checks `vizion-user` in local storage and enforces the required role before rendering protected content.

### `frontend/src/components/PublicOnlyRoute.jsx`

`PublicOnlyRoute` redirects an already authenticated user away from login, registration, and password reset pages.

### `frontend/src/components/LandingScreen.jsx`

`LandingScreen` accepts a natural-language interview request, provides suggested topics, supports optional speech input, and begins interview configuration.

### `frontend/src/components/OptionsScreen.jsx`

`OptionsScreen` displays generated interview strategy cards and lets the user select one.

### `frontend/src/components/PlanConfirmation.jsx`

`PlanConfirmation` presents interview metadata, segments, and opening questions, then supports confirm or change actions.

### `frontend/src/components/InterviewScreen.jsx`

- `looksLikeCodingQuestion()` detects whether a question needs a code editor.
- `InterviewScreen` manages the live transcript, microphone, speech synthesis, camera stream, engagement tracking, timers, code history, follow-ups, segment transitions, and completion.

### `frontend/src/components/ReportScreen.jsx`

- `normalizeReport()` handles alternate report field names and improvement formats.
- `ReportScreen` displays overall score, segment scores, technical/communication metrics, improvements, strengths, concerns, and recommendations.

### `frontend/src/components/History.jsx`

- `getRole()`, `getScore()`, `formatDate()`, and `getQuestionAnswers()` derive readable values from saved sessions.
- `History` lists sessions, opens details, selects batches, deletes individual sessions, deletes selected sessions, and deletes all history.

### `frontend/src/components/StudentDashboard.jsx`

- `StudentDashboard` loads student data and switches between dashboard, profile, practice, projects, and company-needs views.
- `PracticeView` generates, selects, evaluates, and locally persists practice topics.
- `DashboardView` shows metrics, activity, time, date, weather, and location.
- `Metric` renders one metric tile.
- `ProfileView` edits interests, skills, and profile photo.
- `ProjectView` submits, lists, links, and deletes GitHub projects.
- `CompanyView` searches companies by name, skill, and interest, opens company details, and accepts or withdraws applications.
- `CompanyDetails` displays company photo, email, briefs, skills, and application actions.
- `SectionHeading` renders dashboard section headings.

### `frontend/src/components/CompanyDashboard.jsx`

`CompanyDashboard` publishes and deletes briefs, discovers students, filters student results, monitors applications, refreshes applications, manages the company profile photo, and deletes the company account.

`StudentProfileModal` displays a student photo, contact details, projects with clickable GitHub links, skills, interests, and application information.

### `frontend/src/components/ProfilePhotoPicker.jsx`

`ProfilePhotoPicker` validates JPG, PNG, and WebP files, limits files to 2 MB, converts selected images to base64 data URLs, previews them, and supports removal.

### `frontend/src/components/DashboardLayout.jsx`

`DashboardLayout` provides a reusable dashboard shell with branding, live status, notifications, role information, and logout.

### `frontend/src/components/about.jsx`

`About` renders the static project/creator information page. It receives `onNavigate` for navigation and is currently not registered as a route in `App.jsx`.

### `frontend/src/components/signals.jsx`

`Signals` calculates and displays performance KPIs, competency bars, weekly activity, insights, and recommended focus from interview history. It is currently not registered as a route in `App.jsx`.

## Frontend Stylesheets And Assets

### `frontend/src/index.css`

Global CSS variables, typography, browser reset, code styling, and focus-visible behavior.

### `frontend/src/App.css`

Legacy/shared application styles, including starter layout rules and reusable base declarations.

### `frontend/src/styles/LandingScreen.css`

The reference VIZION visual system: black grid background, magenta/red signal accents, technical rail, compact mono labels, outlined telemetry panel, and interview prompt controls.

### `frontend/src/styles/InterviewScreen.css`

Live interview layout: split transcript/editor/camera panels, progress bar, question box, code area, timer, statuses, microphone controls, and responsive layout.

### `frontend/src/styles/InterviewTheme.css`

Shared visual overrides that propagate the reference interview aesthetic across the application.

### `frontend/src/styles/Auth.css`

Login, registration, and password-reset page layout and controls.

### `frontend/src/styles/OptionsScreen.css`

Interview strategy option cards and selection states.

### `frontend/src/styles/PlanConfirmation.css`

Interview plan metadata, segment cards, question presentation, and confirmation controls.

### `frontend/src/styles/ReportScreen.css`

Report score display, metrics, recommendations, strengths, concerns, and responsive report layout.

### `frontend/src/styles/History.css`

Interview archive list, session detail view, delete controls, selection mode, and responsive history layout.

### `frontend/src/styles/InfoPages.css`

Shared informational-page navigation, hero layout, cards, About sections, and common informational page primitives.

### `frontend/src/styles/signals.css`

Signals KPI cards, competency visualizations, activity data, insights, and focus controls.

### `frontend/src/styles/StudentDashboard.css`

Student header, sidebar, metrics, analytics panels, profile, project, practice, company-needs, search, modal, and responsive workspace styles.

### `frontend/src/styles/CompanyDashboard.css`

Company header, publishing form, student discovery results, brief list, applicants, profile photo picker, modal, and responsive workspace styles.

### `frontend/src/assets/*`

Static image and logo assets used by the landing/About pages and the Vite starter assets. `hero.png`, `image1.png`, `vizion.jpg`, `vizion1.jpg`, `logo_vizion.jpg`, and `logo_vizion.ico` are project media; `react.svg` and `vite.svg` are starter assets.

### `frontend/public/*`

Public static files served directly by Vite, including favicon and icon resources when present.

## Data And Navigation Flow

1. Login or registration stores the public user object in `localStorage` under `vizion-user`.
2. Protected routes send students and companies to their role-specific dashboards.
3. A student starts an interview from the landing view, selects an approach, confirms a plan, completes live turns, and receives a report.
4. Completed reports are stored in `vizion-interview-history` in the browser.
5. Student practice topics are stored in `vizion_practice_topics`.
6. Dashboard API calls use Axios helpers in `api.js`.
7. FastAPI routes validate requests, use MySQL through `database.py`, and call Gemini through `llm_client.py` when AI output is required.
8. Company briefs, student projects, applications, profile photos, and reset OTP records are persisted server-side.

## Important Caveats

- MySQL must be running before FastAPI starts.
- AI functionality requires a valid `GEMINI_API_KEY`.
- Gmail password reset requires a Google-generated App Password and a matching `GMAIL_ADDRESS`.
- Authentication is currently frontend/local-storage based; production deployment should add server-side sessions or JWTs.
- Browser APIs and external weather/geocoding services depend on permissions and network access.
- Do not commit `.env`, API keys, or the experimental hard-coded key in `openRouter_testing.py`.
