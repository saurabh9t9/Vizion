from dotenv import load_dotenv
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from database import initialize
from routes import auth, collaboration, interview, plan, report
from services.practice_questions import router as practice_router


# ============================================================
# LOAD ENVIRONMENT
# ============================================================

load_dotenv()


# ============================================================
# FASTAPI APP
# ============================================================

app = FastAPI(
    title="VIZION Backend",
    version="0.1.0"
)


# ============================================================
# CORS
# ============================================================

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173",
        "http://127.0.0.1:5173",
        "http://localhost:4173",
        "http://127.0.0.1:4173",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# ============================================================
# ROUTERS
# ============================================================

app.include_router(plan.router)
app.include_router(interview.router)
app.include_router(report.router)
app.include_router(auth.router)
app.include_router(collaboration.router)

# Practice questions
app.include_router(practice_router)


# ============================================================
# DATABASE INITIALIZATION
# ============================================================

@app.on_event("startup")
async def initialize_database():
    try:
        initialize()
        print("Database initialized successfully.")
    except Exception as e:
        print(f"Database initialization error: {e}")


# ============================================================
# ROOT
# ============================================================

@app.get("/")
async def root():
    return {
        "message": "VIZION Backend",
        "status": "running"
    }


# ============================================================
# HEALTH
# ============================================================

@app.get("/health")
async def health():
    return {
        "status": "healthy"
    }


# ============================================================
# RUN SERVER
# ============================================================

if __name__ == "__main__":
    import uvicorn

    uvicorn.run(
        "main:app",
        host="0.0.0.0",
        port=8000,
        reload=True
    )