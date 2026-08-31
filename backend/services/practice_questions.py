import json
import os

from dotenv import load_dotenv
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel

from google import genai
from google.genai import types


# ============================================================
# LOAD ENVIRONMENT
# ============================================================

load_dotenv()


# ============================================================
# ROUTER
# ============================================================

router = APIRouter()


# ============================================================
# GEMINI CONFIGURATION
# ============================================================

GEMINI_API_KEY = os.getenv("GEMINI_API_KEY")

GEMINI_MODEL = os.getenv(
    "GEMINI_MODEL",
    "gemini-2.5-flash"
)


# ============================================================
# GEMINI CLIENT
# ============================================================

client = None

if GEMINI_API_KEY:
    client = genai.Client(
        api_key=GEMINI_API_KEY
    )


# ============================================================
# REQUEST MODELS
# ============================================================

class TopicRequest(BaseModel):
    topic: str


class EvaluationRequest(BaseModel):
    problem_title: str
    problem_description: str
    code: str


# ============================================================
# JSON PARSER
# ============================================================

def parse_json_response(text: str):

    if not text:
        raise ValueError(
            "Gemini returned an empty response."
        )

    text = text.strip()

    # Remove ```json
    if text.startswith("```json"):
        text = text[7:]

    # Remove ```
    elif text.startswith("```"):
        text = text[3:]

    # Remove ending ```
    if text.endswith("```"):
        text = text[:-3]

    text = text.strip()

    return json.loads(text)


# ============================================================
# GENERATE PRACTICE QUESTIONS
# ============================================================

@router.post("/api/generate-practice")
async def generate_practice(
    req: TopicRequest
):

    # --------------------------------------------------------
    # Validate topic
    # --------------------------------------------------------

    topic = req.topic.strip()

    if not topic:
        raise HTTPException(
            status_code=400,
            detail="Topic cannot be empty."
        )

    # --------------------------------------------------------
    # Check Gemini
    # --------------------------------------------------------

    if client is None:
        raise HTTPException(
            status_code=500,
            detail="GEMINI_API_KEY is not configured."
        )

    # --------------------------------------------------------
    # Prompt
    # --------------------------------------------------------

    prompt = f"""
You are an expert coding interview problem designer.

Generate exactly 3 coding practice problems
for the topic:

{topic}

Requirements:

- Problems should from easy to hard
- Problems must be different.
- Include clear problem descriptions.
- Include constraints.
- Include examples.
- Include starter code.
- Do not provide solutions.
- Return ONLY valid JSON.
- Do not use Markdown.

Return exactly:

[
  {{
    "title": "Problem Title",
    "difficulty": "Easy",
    "description": "Problem description, constraints and examples.",
    "starterCode": "# Write your solution here"
  }},
  {{
    "title": "Problem Title",
    "difficulty": "Medium",
    "description": "Problem description, constraints and examples.",
    "starterCode": "# Write your solution here"
  }},
  {{
    "title": "Problem Title",
    "difficulty": "Hard",
    "description": "Problem description, constraints and examples.",
    "starterCode": "# Write your solution here"
  }}
]
"""

    # --------------------------------------------------------
    # Gemini request
    # --------------------------------------------------------

    try:

        response = client.models.generate_content(
            model=GEMINI_MODEL,
            contents=prompt,
            config=types.GenerateContentConfig(
                response_mime_type="application/json"
            )
        )

        result = parse_json_response(
            response.text
        )

        # ----------------------------------------------------
        # Validate
        # ----------------------------------------------------

        if not isinstance(result, list):
            raise ValueError(
                "Gemini response is not a JSON array."
            )

        if len(result) != 3:
            raise ValueError(
                "Gemini did not return exactly 3 problems."
            )

        return result

    except json.JSONDecodeError:

        raise HTTPException(
            status_code=500,
            detail="Gemini returned invalid JSON."
        )

    except Exception as e:

        print(
            "Gemini error:",
            str(e)
        )

        raise HTTPException(
            status_code=500,
            detail=f"Gemini generation error: {str(e)}"
        )


# ============================================================
# EVALUATE PRACTICE
# ============================================================

@router.post("/api/evaluate-practice")
async def evaluate_practice(
    req: EvaluationRequest
):

    # --------------------------------------------------------
    # Check Gemini
    # --------------------------------------------------------

    if client is None:
        raise HTTPException(
            status_code=500,
            detail="GEMINI_API_KEY is not configured."
        )

    # --------------------------------------------------------
    # Prompt
    # --------------------------------------------------------

    prompt = f"""
You are an expert programming interviewer.

Evaluate the following Python solution.

Problem:
{req.problem_title}

Description:
{req.problem_description}

Submitted Code:
{req.code}

Evaluate:

1. Correctness
2. Logic
3. Edge cases
4. Time complexity
5. Space complexity
6. Code quality

Return ONLY valid JSON.

Use exactly:

{{
  "score": 85,
  "passed": true,
  "feedback": "Concise evaluation."
}}

Rules:

- score must be between 0 and 100.
- passed must be true when the solution is substantially correct.
- passed must be false when the solution is incorrect.
"""

    # --------------------------------------------------------
    # Gemini request
    # --------------------------------------------------------

    try:

        response = client.models.generate_content(
            model=GEMINI_MODEL,
            contents=prompt,
            config=types.GenerateContentConfig(
                response_mime_type="application/json"
            )
        )

        result = parse_json_response(
            response.text
        )

        if not isinstance(result, dict):
            raise ValueError(
                "Gemini response is not a JSON object."
            )

        return result

    except json.JSONDecodeError:

        raise HTTPException(
            status_code=500,
            detail="Gemini returned invalid JSON."
        )

    except Exception as e:

        print(
            "Evaluation error:",
            str(e)
        )

        raise HTTPException(
            status_code=500,
            detail=f"Evaluation error: {str(e)}"
        )


# ============================================================
# TEST ROUTE
# ============================================================

@router.get("/api/practice-test")
async def practice_test():

    return {
        "status": "ok",
        "message": "Practice router is working",
        "model": GEMINI_MODEL,
        "gemini_configured": bool(GEMINI_API_KEY)
    }