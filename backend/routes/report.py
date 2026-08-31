from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, Field
from typing import List, Dict, Any, Optional
from services.llm_client import generate_report

router = APIRouter()


class EngagementEntry(BaseModel):
    face_detected: bool
    centered: bool
    timestamp: float


class CodeSnapshot(BaseModel):
    code: str
    timestamp: float
    segment_index: int


class TranscriptEntry(BaseModel):
    speaker: str
    text: str
    timestamp: float
    segment_index: int


class TechnicalMetrics(BaseModel):
    correctness: Optional[str] = None
    complexity: Optional[str] = None
    edgeCases: Optional[str] = None


class CommunicationMetrics(BaseModel):
    explainBeforeCodeRatio: Optional[str] = None
    silenceBehavior: Optional[str] = None
    clarity: Optional[str] = None


class SegmentReport(BaseModel):
    type: str
    focus: str
    summary: str
    technical: Optional[TechnicalMetrics] = None
    communication: Optional[CommunicationMetrics] = None


class ReportResponse(BaseModel):
    overall_score: Optional[int] = 0
    recommendation: Optional[Dict[str, Any]] = None
    competencies: Optional[List[Dict[str, Any]]] = None
    segments: Optional[List[Dict[str, Any]]] = None
    communication: Optional[Dict[str, Any]] = None
    behavioral: Optional[Dict[str, Any]] = None
    technical: Optional[Dict[str, Any]] = None
    improvements: Optional[List[Any]] = None
    strength: Optional[str] = None
    biggest_concern: Optional[str] = None
    final_summary: Optional[str] = None

    class Config:
        extra = "allow"


class ReportRequest(BaseModel):
    plan: List[dict]
    full_transcript: List[TranscriptEntry]
    code_history: List[CodeSnapshot]
    engagement_log: List[EngagementEntry]


@router.post("/api/generate-report", response_model=ReportResponse)
async def generate_report_endpoint(request: ReportRequest):
    """Generate a comprehensive interview performance report."""
    try:
        result = generate_report(
            plan=request.plan,
            full_transcript=[dict(t) for t in request.full_transcript],
            code_history=[dict(c) for c in request.code_history],
            engagement_log=[dict(e) for e in request.engagement_log]
        )

        if not isinstance(result, dict):
            result = {}

        result.setdefault("overall_score", 0)
        result.setdefault("recommendation", {
            "decision": "unknown",
            "confidence": "low",
            "reason": "No recommendation available yet."
        })
        result.setdefault("competencies", [])
        result.setdefault("segments", [])
        result.setdefault("communication", {
            "score": 0,
            "clarity": "not_demonstrated",
            "structure": "not_demonstrated",
            "technical_explanation": "not_demonstrated"
        })
        result.setdefault("behavioral", {
            "score": 0,
            "strengths": [],
            "concerns": []
        })
        result.setdefault("technical", {
            "score": 0,
            "strengths": [],
            "weaknesses": []
        })
        result.setdefault("improvements", [])
        result.setdefault("strength", "No major strengths were clearly demonstrated.")
        result.setdefault("biggest_concern", "Not enough evidence was collected to assess this fully.")
        result.setdefault("final_summary", "The interview was completed, but the available evidence is limited.")

        return ReportResponse(**result)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error generating report: {str(e)}")