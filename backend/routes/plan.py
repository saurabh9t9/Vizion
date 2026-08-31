from typing import List
from fastapi import APIRouter
from pydantic import BaseModel
from services.llm_client import generate_interview_plan, generate_interview_options

router = APIRouter()

# --- NEW: Options Models ---
class OptionsRequest(BaseModel):
    topic: str

class InterviewOption(BaseModel):
    option_id: int
    title: str
    description: str
    difficulty: str

class OptionsResponse(BaseModel):
    options: List[InterviewOption]

# --- EXISTING: Plan Models ---
class PlanRequest(BaseModel):
    raw_request: str

class InterviewMetadata(BaseModel):
    target_role: str
    industry: str
    difficulty_level: str
    total_duration_minutes: int

class PreparedQuestion(BaseModel):
    question_text: str
    purpose: str
    probing_questions: List[str]  
    ideal_answer_highlights: List[str] 
    red_flags: List[str]  

class SegmentResponse(BaseModel):
    segment_name: str
    type: str
    duration_minutes: int
    focus: str
    evaluation_criteria: List[str]
    questions: List[PreparedQuestion]  

class PlanResponse(BaseModel):
    interview_metadata: InterviewMetadata
    segments: List[SegmentResponse]

# --- ENDPOINTS ---

@router.post("/api/generate-options", response_model=OptionsResponse)
async def generate_options(request: OptionsRequest):
    """Generate 3-4 Kahoot-style interview options based on a topic."""
    try:
        result = generate_interview_options(request.topic)
        return OptionsResponse(**result)
    except Exception as e:
        from fastapi import HTTPException
        raise HTTPException(status_code=500, detail=f"Error generating options: {str(e)}")


@router.post("/api/generate-plan", response_model=PlanResponse)
async def generate_plan(request: PlanRequest):
    """Generate a structured interview plan with fully pre-prepared questions."""
    try:
        result = generate_interview_plan(request.raw_request)
        return PlanResponse(**result)
    except Exception as e:
        from fastapi import HTTPException
        raise HTTPException(status_code=500, detail=f"Error generating plan: {str(e)}")