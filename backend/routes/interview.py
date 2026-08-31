from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, Field
from services.llm_client import get_interviewer_response

router = APIRouter()


class TranscriptEntry(BaseModel):
    speaker: str
    text: str
    timestamp: float
    segment_index: int


class InterviewTurnRequest(BaseModel):
    plan: list[dict]
    current_segment_index: int
    question: str
    current_question_id: str | None = None
    asked_question_ids: list[str] = Field(default_factory=list)
    follow_up_count: int = 0
    transcript: list[TranscriptEntry]
    current_code: str | None = None
    seconds_since_last_activity: float = 0.0
    trigger_reason: str = "manual"


class InterviewTurnResponse(BaseModel):
    interviewer_line: str = Field(default="", alias="interviewer_line")
    advance_segment: bool = False
    show_code_editor: bool = False

    @classmethod
    def from_response_dict(cls, payload: dict):
        normalized = dict(payload)
        if "interviewer_line" not in normalized:
            for key in ["intervener_line", "interv_line", "line", "response"]:
                if key in normalized:
                    normalized["interviewer_line"] = normalized[key]
                    break
        return cls(**normalized)

    class Config:
        populate_by_name = True
        extra = "allow"


@router.post("/api/interview-turn", response_model=InterviewTurnResponse)
async def interview_turn(request: InterviewTurnRequest):
    """Generate the interviewer's next response based on context."""
    try:
        result = get_interviewer_response(
            plan=request.plan,
            current_segment_index=request.current_segment_index,
            question=request.question,
            current_question_id=request.current_question_id,
            asked_question_ids=request.asked_question_ids,
            follow_up_count=request.follow_up_count,
            transcript=[dict(t) for t in request.transcript],
            current_code=request.current_code,
            seconds_since_last_activity=request.seconds_since_last_activity,
            trigger_reason=request.trigger_reason
        )
        
        # Bulletproof fallback: Check for any common typo/variation from Gemini and map it to 'interviewer_line'
        if "interviewer_line" not in result:
            for possible_key in ["intervener_line", "interv_line", "line", "response"]:
                if possible_key in result:
                    result["interviewer_line"] = result.pop(possible_key)
                    break

        return InterviewTurnResponse.from_response_dict(result)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error processing interview turn: {str(e)}")