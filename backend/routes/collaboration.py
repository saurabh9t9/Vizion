from datetime import date, datetime, timedelta
from uuid import uuid4

from fastapi import APIRouter, HTTPException, status
from pydantic import BaseModel, Field, HttpUrl

from database import connection
try:
    from services.llm_client import _generate_content
except ImportError:
    _generate_content = None
import json

router = APIRouter(tags=["collaboration"])


class ProjectRequest(BaseModel):
    student_email: str = Field(min_length=5)
    career_path: str = Field(min_length=2, max_length=100)
    title: str = Field(min_length=2, max_length=150)
    github_url: HttpUrl


class ApplicationRequest(BaseModel):
    problem_id: str
    student_email: str = Field(min_length=5)
    student_name: str = Field(default="Student", max_length=100)


class PracticeEvaluationRequest(BaseModel):
    problem_id: str
    student_email: str = Field(min_length=5)
    code: str = Field(min_length=1, max_length=20000)
    language: str = Field(default="python", max_length=30)


class ProfileRequest(BaseModel):
    student_email: str = Field(min_length=5)
    interests: list[str] = Field(default_factory=list, max_length=20)
    skills: list[str] = Field(default_factory=list, max_length=20)


class CompanyProblemRequest(BaseModel):
    company_email: str = Field(min_length=5)
    title: str = Field(min_length=2, max_length=150)
    description: str = Field(min_length=10, max_length=5000)
    skills: list[str] = Field(default_factory=list, max_length=20)


def problem_from_row(row):
    problem = dict(row)
    problem["skills"] = problem["skills"].split(",")
    return problem


def project_from_row(row):
    project = dict(row)
    if project.get("created_at"):
        project["created_at"] = project["created_at"].isoformat()
    return project


@router.get("/profile")
async def get_profile(student_email: str):
    with connection() as database:
        row = database.execute("SELECT name, email, role, interests, skills, profile_photo FROM users WHERE email = ? AND role = 'student'", (student_email.lower(),)).fetchone()
        if not row:
            raise HTTPException(status_code=404, detail="Student account not found.")
        project_count = database.execute("SELECT COUNT(*) AS count FROM projects WHERE student_email = ?", (student_email.lower(),)).fetchone()["count"]
    return {"name": row["name"], "email": row["email"], "role": row["role"], "profile_photo": row["profile_photo"], "interests": [item for item in row["interests"].split(",") if item], "skills": [item for item in row["skills"].split(",") if item], "projects": project_count}


@router.put("/profile")
async def update_profile(request: ProfileRequest):
    interests = list(dict.fromkeys(item.strip() for item in request.interests if item.strip()))
    skills = list(dict.fromkeys(item.strip() for item in request.skills if item.strip()))
    with connection() as database:
        cursor = database.execute("UPDATE users SET interests = ?, skills = ? WHERE email = ? AND role = 'student'", (",".join(interests), ",".join(skills), request.student_email.lower()))
        if cursor.rowcount == 0:
            raise HTTPException(status_code=404, detail="Student account not found.")
    return {"message": "Profile saved.", "interests": interests, "skills": skills}


@router.post("/projects", status_code=status.HTTP_201_CREATED)
async def submit_project(request: ProjectRequest):
    with connection() as database:
        user = database.execute("SELECT email FROM users WHERE email = ? AND role = 'student'", (request.student_email.lower(),)).fetchone()
        if not user:
            raise HTTPException(status_code=404, detail="Student account not found.")
        cursor = database.execute("INSERT INTO projects (student_email, career_path, title, github_url) VALUES (?, ?, ?, ?)", (request.student_email.lower(), request.career_path, request.title.strip(), str(request.github_url)))
        row = database.execute("SELECT * FROM projects WHERE id = ?", (cursor.lastrowid,)).fetchone()
    return dict(row)


@router.get("/projects")
async def get_projects(student_email: str):
    with connection() as database:
        rows = database.execute("SELECT * FROM projects WHERE student_email = ? ORDER BY created_at DESC, id DESC", (student_email.lower(),)).fetchall()
    return {"projects": [dict(row) for row in rows]}


@router.delete("/projects/{project_id}")
async def delete_project(project_id: int, student_email: str):
    with connection() as database:
        cursor = database.execute("DELETE FROM projects WHERE id = ? AND student_email = ?", (project_id, student_email.lower()))
        if cursor.rowcount == 0:
            raise HTTPException(status_code=404, detail="Project not found.")
    return {"message": "Project deleted."}


@router.get("/company-problems")
async def get_company_problems():
    with connection() as database:
        rows = database.execute("""
            SELECT cp.*, u.profile_photo
            FROM company_problems cp
            LEFT JOIN users u ON u.email = cp.company_email AND u.role = 'company'
            ORDER BY cp.id
        """).fetchall()
    return {"problems": [problem_from_row(row) for row in rows]}


@router.post("/company-problems", status_code=status.HTTP_201_CREATED)
async def post_company_problem(request: CompanyProblemRequest):
    company_email = request.company_email.strip().lower()
    with connection() as database:
        company = database.execute("SELECT name, email FROM users WHERE email = ? AND role = 'company'", (company_email,)).fetchone()
        if not company:
            raise HTTPException(status_code=403, detail="Only company accounts can post problem statements.")
        problem_id = f"problem-{uuid4().hex}"
        database.execute("INSERT INTO company_problems (id, title, description, company, company_email, skills) VALUES (?, ?, ?, ?, ?, ?)", (problem_id, request.title.strip(), request.description.strip(), company["name"], company_email, ",".join(request.skills)))
        row = database.execute("SELECT * FROM company_problems WHERE id = ?", (problem_id,)).fetchone()
    return problem_from_row(row)


@router.delete("/company-problems/{problem_id}")
async def delete_company_problem(problem_id: str, company_email: str):
    with connection() as database:
        problem = database.execute("SELECT id FROM company_problems WHERE id = ? AND company_email = ?", (problem_id, company_email.strip().lower())).fetchone()
        if not problem:
            raise HTTPException(status_code=404, detail="Brief not found or does not belong to this company.")
        database.execute("DELETE FROM applications WHERE problem_id = ?", (problem_id,))
        database.execute("DELETE FROM company_problems WHERE id = ?", (problem_id,))
    return {"message": "Brief deleted."}


@router.get("/students")
async def get_students(skill: str = "", interest: str = "", min_projects: int = 0):
    with connection() as database:
        rows = database.execute("""
            SELECT u.name, u.email, u.interests, u.skills, u.profile_photo, COUNT(p.id) AS projects
            FROM users u LEFT JOIN projects p ON p.student_email = u.email
            WHERE u.role = 'student'
            GROUP BY u.email, u.name, u.interests, u.skills, u.profile_photo
            HAVING COUNT(p.id) >= ?
            ORDER BY projects DESC, u.name
        """, (max(0, min_projects),)).fetchall()
        students = []
        for row in rows:
            skills = [item for item in row["skills"].split(",") if item]
            interests = [item for item in row["interests"].split(",") if item]
            if skill.strip() and skill.strip().lower() not in {item.lower() for item in skills}:
                continue
            if interest.strip() and interest.strip().lower() not in {item.lower() for item in interests}:
                continue
            project_rows = database.execute("SELECT id, career_path, title, github_url, status, created_at FROM projects WHERE student_email = ? ORDER BY created_at DESC, id DESC", (row["email"],)).fetchall()
            students.append({"name": row["name"], "email": row["email"], "profile_photo": row["profile_photo"], "skills": skills, "interests": interests, "projects": row["projects"], "project_list": [project_from_row(project) for project in project_rows]})
    return {"students": students}


@router.post("/apply", status_code=status.HTTP_201_CREATED)
async def apply_to_problem(request: ApplicationRequest):
    with connection() as database:
        problem = database.execute("SELECT id FROM company_problems WHERE id = ?", (request.problem_id,)).fetchone()
        if not problem:
            raise HTTPException(status_code=404, detail="Problem not found.")
        try:
            cursor = database.execute("INSERT INTO applications (problem_id, student_email, student_name) VALUES (?, ?, ?)", (request.problem_id, request.student_email.lower(), request.student_name.strip()))
        except Exception as error:
            if "UNIQUE constraint failed" in str(error):
                raise HTTPException(status_code=409, detail="You have already applied to this problem.") from error
            raise
    return {"message": "Application sent to the company.", "application_id": cursor.lastrowid}


@router.get("/applications")
async def get_applications(student_email: str | None = None, company_email: str | None = None):
    with connection() as database:
        if company_email:
            rows = database.execute("""
                SELECT a.id, a.problem_id, a.student_email, a.student_name, a.created_at,
                       cp.title AS problem_title, u.interests, u.skills, u.profile_photo,
                       COUNT(p.id) AS projects
                FROM applications a
                JOIN company_problems cp ON cp.id = a.problem_id
                JOIN users u ON u.email = a.student_email
                LEFT JOIN projects p ON p.student_email = a.student_email
                WHERE cp.company_email = ?
                GROUP BY a.id, a.problem_id, a.student_email, a.student_name, a.created_at,
                         cp.title, u.interests, u.skills, u.profile_photo
                ORDER BY a.created_at DESC, a.id DESC
            """, (company_email.strip().lower(),)).fetchall()
            applications = []
            for row in rows:
                application = dict(row)
                application["interests"] = [item for item in row["interests"].split(",") if item]
                application["skills"] = [item for item in row["skills"].split(",") if item]
                applications.append(application)
                application["project_list"] = [project_from_row(project) for project in database.execute("SELECT id, career_path, title, github_url, status, created_at FROM projects WHERE student_email = ? ORDER BY created_at DESC, id DESC", (row["student_email"],)).fetchall()]
            return {"applications": applications}
        if not student_email:
            raise HTTPException(status_code=422, detail="student_email or company_email is required.")
        rows = database.execute("SELECT problem_id FROM applications WHERE student_email = ?", (student_email.strip().lower(),)).fetchall()
    return {"applications": [dict(row) for row in rows]}


@router.delete("/applications/{problem_id}")
async def withdraw_application(problem_id: str, student_email: str):
    with connection() as database:
        cursor = database.execute("DELETE FROM applications WHERE problem_id = ? AND student_email = ?", (problem_id, student_email.strip().lower()))
        if cursor.rowcount == 0:
            raise HTTPException(status_code=404, detail="Application not found.")
    return {"message": "Application withdrawn."}


@router.get("/practice-problems")
async def get_practice_problems():
    with connection() as database:
        rows = database.execute("SELECT * FROM practice_problems ORDER BY id").fetchall()
    return {"problems": [dict(row) for row in rows]}


@router.post("/practice/evaluate")
async def evaluate_practice(request: PracticeEvaluationRequest):
    score = min(100, 40 + (30 if "def " in request.code else 0) + (20 if "return" in request.code else 0) + (10 if len(request.code) > 40 else 0))
    with connection() as database:
        problem = database.execute("SELECT id FROM practice_problems WHERE id = ?", (request.problem_id,)).fetchone()
        if not problem:
            raise HTTPException(status_code=404, detail="Practice problem not found.")
        database.execute("INSERT INTO practice_attempts (problem_id, student_email, score, language) VALUES (?, ?, ?, ?)", (request.problem_id, request.student_email.lower(), score, request.language))
    return {"score": score, "status": "Evaluated", "feedback": "Good structure. Check edge cases and explain the time complexity before submitting."}


@router.get("/student-stats")
async def get_student_stats(student_email: str):
    today = datetime.now().date()
    with connection() as database:
        student_email = student_email.lower()
        user = database.execute("SELECT email FROM users WHERE email = ? AND role = 'student'", (student_email,)).fetchone()
        if user and not database.execute("SELECT id FROM login_events WHERE user_email = ? AND DATE(logged_at) = ? LIMIT 1", (student_email, today)).fetchone():
            database.execute("INSERT INTO login_events (user_email) VALUES (?)", (student_email,))
        project_count = database.execute("SELECT COUNT(*) AS count FROM projects WHERE student_email = ?", (student_email,)).fetchone()["count"]
        application_count = database.execute("SELECT COUNT(*) AS count FROM applications WHERE student_email = ?", (student_email,)).fetchone()["count"]
        average_score = database.execute("SELECT COALESCE(ROUND(AVG(score)), 0) AS score FROM practice_attempts WHERE student_email = ?", (student_email,)).fetchone()["score"]
        login_rows = database.execute("SELECT DISTINCT DATE(logged_at) AS login_date FROM login_events WHERE user_email = ? ORDER BY login_date DESC", (student_email,)).fetchall()
    login_dates = [row["login_date"] for row in login_rows]
    streak = 0
    expected_date = today
    for login_date in login_dates:
        if isinstance(login_date, datetime):
            login_date = login_date.date()
        elif isinstance(login_date, str):
            login_date = date.fromisoformat(login_date[:10])
        if login_date != expected_date:
            break
        streak += 1
        expected_date -= timedelta(days=1)
    return {"projects": project_count, "applications": application_count, "average_score": average_score, "login_streak": streak}

@router.get("/competencies")
async def get_competencies(student_email: str):
    with connection() as database:
        projects = [dict(row) for row in database.execute("SELECT title, career_path FROM projects WHERE student_email = ?", (student_email.lower(),)).fetchall()]
        attempts = [dict(row) for row in database.execute("SELECT problem_id, score, language FROM practice_attempts WHERE student_email = ?", (student_email.lower(),)).fetchall()]

    evidence = {"projects": projects, "practice_attempts": attempts}
    if _generate_content and projects:
        prompt = "Return JSON only with keys problem_solving, technical_depth, communication, consistency. Score each from 0 to 100 using only this student evidence: " + json.dumps(evidence, default=str)
        try:
            response = _generate_content(prompt, max_retries=1)
            text = getattr(response, "text", "")
            parsed = json.loads(text.strip().replace("```json", "").replace("```", ""))
            if all(key in parsed for key in ("problem_solving", "technical_depth", "communication", "consistency")):
                return {"competencies": {key: max(0, min(100, int(parsed[key]))) for key in parsed}}
        except Exception:
            pass

    average_score = round(sum(item["score"] for item in attempts) / len(attempts)) if attempts else 0
    return {"competencies": {"problem_solving": min(100, 40 + len(projects) * 10 + average_score // 5), "technical_depth": min(100, average_score + len(projects) * 8), "communication": min(100, 35 + len(projects) * 12), "consistency": min(100, len(attempts) * 20)}}
