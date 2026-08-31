import os
import json
import time
from typing import Any, Dict, List, Optional

from dotenv import load_dotenv
from google import genai
from google.genai import errors


# ============================================================
# ENVIRONMENT
# ============================================================

# Load backend/.env
load_dotenv()

API_KEY = os.getenv("GEMINI_API_KEY")
DEFAULT_MODEL_NAME = "gemini-3.5-flash-lite"
MODEL_NAME = (os.getenv("GEMINI_MODEL") or DEFAULT_MODEL_NAME).strip().strip('"\'')

if not API_KEY:
    print("[VIZION] WARNING: API_KEY is not set. AI interview responses will fail until it is added to backend/.env")

client = genai.Client(api_key=API_KEY) if API_KEY else None


# ============================================================
# MASTER INTERVIEW ENGINE
# ============================================================

MASTER_INTERVIEW_PROMPT = """
You are VIZION'S MASTER INTERVIEW ENGINE.

You are an expert interviewer, hiring manager, technical evaluator,
behavioral interviewer, assessment designer, and interview coach.

Your responsibility is to intelligently handle ANY interview request.

You must determine the correct interview strategy dynamically from
the user's request, role requirements, candidate context, seniority,
difficulty, and interview type.

============================================================
CORE PRINCIPLE
============================================================

DO NOT use separate hard-coded prompts for individual domains.

Do NOT create separate logic for:

- AI/ML
- Data Science
- Software Engineering
- Backend
- Frontend
- HR
- Marketing
- Finance
- Cybersecurity
- Product
- Management
- or any other individual domain.

Instead, dynamically infer what must be evaluated.

The system must reason through:

JOB / ROLE
    ↓
RESPONSIBILITIES
    ↓
COMPETENCIES
    ↓
ASSESSMENT METHODS
    ↓
QUESTIONS
    ↓
FOLLOW-UPS
    ↓
EVIDENCE
    ↓
EVALUATION

The role determines WHAT should be tested.

The interview type determines HOW it should be tested.

The seniority determines HOW DEEPLY it should be tested.

============================================================
INTERVIEW TYPES
============================================================

Possible assessment types include:

- HR
- behavioral
- technical
- coding
- dsa
- system_design
- case_study
- portfolio
- resume_based
- role_play
- leadership
- communication
- practical
- domain_assessment
- mixed

These are categories, NOT fixed templates.

Select only the assessment types relevant to the request.

============================================================
ROLE ANALYSIS
============================================================

First identify the capabilities normally required by the role.

Then convert those capabilities into assessments.

Examples:

Implementation required
→ practical or coding assessment.

Analytical reasoning required
→ analytical problem or case study.

Architecture required
→ system design or architecture scenario.

Communication required
→ explanation and communication assessment.

Leadership required
→ decision-making, ownership and leadership scenarios.

Do not add irrelevant assessments.

============================================================
SENIORITY
============================================================

ENTRY LEVEL:

Focus on:

- fundamentals
- reasoning
- learning ability
- academic/project experience
- simple practical problems

MID LEVEL:

Focus on:

- independent execution
- practical experience
- debugging
- decision making
- trade-offs
- reliability

SENIOR:

Focus on:

- complex problems
- ambiguity
- architecture
- optimization
- ownership
- mentoring
- leadership
- trade-offs

EXECUTIVE:

Focus on:

- strategy
- organizational impact
- risk
- prioritization
- leadership
- long-term decision making

============================================================
THEORY VS PRACTICAL ROUTING
============================================================

If the request focuses on:

- theory
- concepts
- fundamentals
- verbal explanation

use:

technical_hard_skills

Do NOT use DSA merely because the interview is technical.

ONLY use:

dsa

when the request explicitly requires:

- coding
- algorithms
- DSA
- programming implementation
- algorithmic problem solving

A DSA question must be a concrete implementation problem.

============================================================
QUESTION QUALITY
============================================================

Every question must have a clear evaluation purpose.

Questions must be:

- relevant
- realistic
- unambiguous
- non-repetitive
- progressive
- appropriate for seniority
- appropriate for difficulty

Prefer practical reasoning over memorization.

Do not ask questions merely because they are commonly asked.

============================================================
BEHAVIORAL ASSESSMENT
============================================================

When behavioral assessment is appropriate, assess:

- ownership
- teamwork
- communication
- adaptability
- conflict resolution
- accountability
- decision making
- learning
- leadership

Prefer real experience-based questions.

============================================================
CODING / DSA
============================================================

When coding is required:

Create a concrete coding problem.

Include:

- problem statement
- requirements
- constraints
- examples
- edge cases
- evaluation criteria

Do NOT reveal the solution.

Do NOT provide implementation unless explicitly asked
outside the interview.

Do not evaluate implementation before the candidate submits code.

============================================================
SYSTEM DESIGN
============================================================

When system design is required, evaluate:

- requirements gathering
- assumptions
- architecture
- scalability
- reliability
- data/storage
- APIs/interfaces
- failure handling
- security
- observability
- trade-offs

Allow the candidate to clarify requirements.

Do not reveal the intended architecture.

============================================================
LIVE INTERVIEW BEHAVIOR
============================================================

Act like a real human interviewer.

After every candidate response:

1. Understand the response.
2. Determine whether it answers the question.
3. Determine whether meaningful clarification is needed.
4. Ask a useful follow-up when the answer gives you something specific to explore.
5. Stay on the same question for up to three follow-ups when the answer warrants it;
    in a strong real-world interview, usually explore two or three distinct dimensions
    before moving to a new question.
6. Otherwise move forward.

Do not endlessly follow up.

Do not repeat questions.

Do not ask multiple questions at once.

Do not reveal internal evaluation.

Do not reveal ideal answers.

Do not coach the candidate unless explicitly requested.

Keep spoken responses concise and natural.

============================================================
SILENCE
============================================================

If the candidate is silent:

Never assume an answer.

Ask whether they need clarification or more time.

Do not treat silence alone as evidence of poor competency.

============================================================
"I DON'T KNOW"
============================================================

If the candidate says:

"I don't know"

respond professionally.

Do not shame the candidate.

Do not reveal the answer unless explicitly requested.

Move forward when appropriate.

============================================================
SCORING
============================================================

Question-level evaluation:

0 = no meaningful evidence
1 = very weak
2 = below expectations
3 = meets expectations
4 = strong
5 = exceptional

Only score what was actually demonstrated.

Never invent evidence.

Final competency scores use:

0-100

The two scoring systems must not be mixed.

============================================================
FAIRNESS
============================================================

Evaluate only job-relevant capabilities.

Never evaluate:

- race
- religion
- ethnicity
- political beliefs
- sexual orientation
- medical information
- family planning
- unrelated personal information
- accent
- identity

Engagement signals such as pauses, silence, or response latency
must NOT be treated as evidence of competence unless directly
relevant and supported by actual interview evidence.

============================================================
INTERVIEW PHILOSOPHY
============================================================

You are not simply generating questions.

You are designing an adaptive interview experience.

The interview should feel:

- realistic
- professional
- conversational
- challenging
- fair
- adaptive
- role-relevant
"""


# ============================================================
# GEMINI CLIENT
# ============================================================

def _require_client():
    """
    Return the configured Gemini client.
    """

    if client is None:
        raise RuntimeError(
            "API_KEY is missing. "
            "Add API_KEY to backend/.env."
        )

    return client


def _resolve_model_name():
    """
    Return a valid Gemini model name in the format expected by the SDK.
    This avoids stale or malformed values from backend/.env and keeps the
    interview flow responsive.
    """

    model_name = (os.getenv("GEMINI_MODEL") or DEFAULT_MODEL_NAME).strip().strip('"\'')

    if not model_name:
        model_name = DEFAULT_MODEL_NAME

    if model_name.startswith("model/"):
        model_name = model_name.replace("model/", "models/", 1)

    if not model_name.startswith("models/"):
        model_name = f"models/{model_name}"

    return model_name


# ============================================================
# GEMINI REQUEST
# ============================================================

def _generate_content(
    contents: str,
    max_retries: int = 3
):
    """
    Send a request to Gemini with retry handling.

    Only this function communicates directly with Gemini.
    """

    model_client = _require_client()
    model_name = _resolve_model_name()

    last_error = None

    for attempt in range(max_retries):

        try:

            response = model_client.models.generate_content(
                model=model_name,
                contents=contents
            )

            return response

        except errors.ServerError as exc:

            last_error = exc

            if attempt < max_retries - 1:

                wait_time = 2 ** attempt

                print(
                    f"VIZION server error "
                    f"(attempt {attempt + 1}/{max_retries}). "
                    f"Retrying in {wait_time}s..."
                )

                time.sleep(wait_time)

        except errors.ClientError as exc:

            raise RuntimeError(
                f"VIZION client error: {exc}"
            ) from exc

        except Exception as exc:

            raise RuntimeError(
                f"Unexpected VIZION error: {exc}"
            ) from exc

    raise RuntimeError(
        "VIZION is temporarily unavailable. "
        "Please try again in a few moments."
    ) from last_error


# ============================================================
# JSON UTILITIES
# ============================================================

def _clean_json_response(response_text: str) -> str:
    """
    Clean common markdown wrappers around JSON.
    """

    if not response_text:
        return ""

    text = response_text.strip()

    if text.startswith("```json"):
        text = text[7:]

    elif text.startswith("```"):
        text = text[3:]

    if text.endswith("```"):
        text = text[:-3]

    return text.strip()


def _repair_invalid_json(json_candidate: str) -> str:
    """
    Repair common Gemini formatting issues such as raw newlines inside JSON strings
    and unquoted object keys.
    """

    fixed = json_candidate.strip()
    if not fixed:
        return fixed

    in_string = False
    escaped = False
    repaired = []

    for ch in fixed:
        if escaped:
            repaired.append(ch)
            escaped = False
            continue

        if ch == "\\":
            repaired.append(ch)
            escaped = True
            continue

        if ch == '"':
            in_string = not in_string
            repaired.append(ch)
            continue

        if in_string and ch in ["\n", "\r", "\t"]:
            repaired.append("\\n" if ch in ["\n", "\r"] else "\\t")
            continue

        repaired.append(ch)

    fixed = "".join(repaired)
    quoted = []
    index = 0
    in_string = False
    escaped = False

    while index < len(fixed):
        character = fixed[index]

        if in_string:
            quoted.append(character)
            if escaped:
                escaped = False
            elif character == "\\":
                escaped = True
            elif character == '"':
                in_string = False
            index += 1
            continue

        if character == '"':
            in_string = True
            quoted.append(character)
            index += 1
            continue

        if character in "{,":
            lookahead = index + 1
            while lookahead < len(fixed) and fixed[lookahead].isspace():
                lookahead += 1

            key_start = lookahead
            if lookahead < len(fixed) and (fixed[lookahead].isalpha() or fixed[lookahead] == "_"):
                lookahead += 1
                while lookahead < len(fixed) and (fixed[lookahead].isalnum() or fixed[lookahead] in "_-"):
                    lookahead += 1

                key_end = lookahead
                while lookahead < len(fixed) and fixed[lookahead].isspace():
                    lookahead += 1

                if lookahead < len(fixed) and fixed[lookahead] == ":":
                    quoted.append(character)
                    quoted.extend(fixed[index + 1:key_start])
                    quoted.append('"')
                    quoted.extend(fixed[key_start:key_end])
                    quoted.append('"')
                    quoted.extend(fixed[key_end:lookahead])
                    index = lookahead
                    continue

        quoted.append(character)
        index += 1

    return "".join(quoted)


def _extract_json(text: str) -> str:
    """
    Extract the outermost JSON object or array if Gemini
    accidentally includes additional text.
    """

    text = _clean_json_response(text)

    if not text:
        return ""

    object_start = text.find("{")
    object_end = text.rfind("}")

    array_start = text.find("[")
    array_end = text.rfind("]")

    candidates = []

    if object_start != -1 and object_end > object_start:
        candidates.append(
            text[object_start:object_end + 1]
        )

    if array_start != -1 and array_end > array_start:
        candidates.append(
            text[array_start:array_end + 1]
        )

    if not candidates:
        return text

    # Usually the largest candidate is the complete response.
    return max(
        candidates,
        key=len
    )


def _parse_json_response(response) -> dict:
    """
    Convert Gemini response into Python JSON.
    """

    response_text = getattr(
        response,
        "text",
        None
    )

    if not response_text:
        raise RuntimeError(
            "VIZION returned an empty response."
        )

    json_text = _extract_json(
        response_text
    )

    try:

        return json.loads(
            json_text
        )

    except json.JSONDecodeError:
        repaired_text = _repair_invalid_json(
            json_text
        )

        try:
            return json.loads(
                repaired_text
            )
        except json.JSONDecodeError as exc:
            raise RuntimeError(
                "Vizion received invalid JSON from Gemini.\n\n"
                f"Gemini response:\n{response_text}"
            ) from exc


# ============================================================
# GENERATE INTERVIEW OPTIONS
# ============================================================

def generate_interview_options(
    topic: str
) -> dict:

    options_prompt = f"""
{MASTER_INTERVIEW_PROMPT}

============================================================
TASK
============================================================

Generate interview options for the following request:

{topic}

Create exactly 3 or 4 genuinely different interview strategies.

The options must differ meaningfully in:

- assessment strategy
- interview type
- difficulty
- practical/theoretical balance
- depth
- candidate experience

Do NOT create superficial options such as:

- Easy Interview
- Hard Interview
- Advanced Interview

Each option must represent a genuinely different interview design.

Return ONLY JSON.

Schema:

{{
    "options": [
        {{
            "option_id": 1,
            "title": "",
            "description": "",
            "interview_type": "",
            "difficulty": "",
            "estimated_duration_minutes": 30,
            "focus_areas": []
        }}
    ]
}}
"""

    response = _generate_content(
        options_prompt
    )

    return _parse_json_response(
        response
    )


# ============================================================
# GENERATE INTERVIEW PLAN
# ============================================================

def generate_interview_plan(
    raw_request: str,
    candidate_context: Optional[Dict[str, Any]] = None,
    job_description: Optional[str] = None
) -> dict:

    candidate_context = (
        candidate_context
        or {}
    )

    job_description = (
        job_description
        or "Not provided."
    )

    plan_prompt = f"""
{MASTER_INTERVIEW_PROMPT}

============================================================
TASK: GENERATE INTERVIEW PLAN
============================================================

Create a complete interview plan.

USER REQUEST:

{raw_request}

============================================================
JOB DESCRIPTION
============================================================

{job_description}

============================================================
CANDIDATE CONTEXT
============================================================

{json.dumps(candidate_context, indent=2)}

============================================================
DYNAMIC ANALYSIS
============================================================

Determine:

- target role
- industry/domain
- seniority
- difficulty
- interview type
- competencies
- assessment methods
- appropriate segments
- question difficulty
- interview duration

Do not force irrelevant segments.

Follow the theory-vs-practical routing rules strictly.

============================================================
QUESTION REQUIREMENTS
============================================================

Every question must contain:

- question
- purpose
- difficulty
- expected time
- probing questions
- ideal answer highlights
- red flags
- scoring rubric

For coding tasks include:

- problem
- requirements
- constraints
- examples
- edge cases

For system design include:

- requirements
- architectural competencies
- trade-offs

============================================================
OUTPUT
============================================================

Return ONLY compact, valid JSON.
Do not wrap it in markdown fences.
Do not include comments.
Do not include LaTeX like $...$.
Do not include raw newlines inside JSON string values.
The JSON must be fully parseable with json.loads().

Schema:

{{
    "interview_metadata": {{
        "target_role": "",
        "industry": "",
        "interview_type": "",
        "difficulty_level": "",
        "total_duration_minutes": 0,
        "skills_assessed": []
    }},

    "segments": [
        {{
            "segment_id": "SEG-1",
            "segment_name": "",
            "type": "",
            "duration_minutes": 0,
            "focus": "",
            "evaluation_criteria": [],

            "questions": [
                {{
                    "question_id": "Q1",
                    "question_text": "",
                    "purpose": "",
                    "difficulty": "",
                    "expected_time_minutes": 0,

                    "probing_questions": [],

                    "ideal_answer_highlights": [],

                    "red_flags": [],

                    "scoring_rubric": {{
                        "0": "",
                        "1": "",
                        "2": "",
                        "3": "",
                        "4": "",
                        "5": ""
                    }}
                }}
            ]
        }}
    ]
}}
"""

    response = _generate_content(
        plan_prompt
    )

    return _parse_json_response(
        response
    )


# ============================================================
# LIVE INTERVIEW CONTROLLER
# ============================================================

def get_interviewer_response(
    plan: list,
    current_segment_index: int,
    question: str,
    transcript: list,
    current_code: str,
    seconds_since_last_activity: float,
    trigger_reason: str,
    current_question_id: Optional[str] = None,
    asked_question_ids: Optional[List[str]] = None,
    follow_up_count: int = 0
) -> dict:

    asked_question_ids = (
        asked_question_ids
        or []
    )

    # --------------------------------------------------------
    # INTERVIEW COMPLETE
    # --------------------------------------------------------

    if current_segment_index >= len(plan):

        return {
            "interviewer_line": (
                "Great job. That concludes the interview. "
                "Let's generate your performance report."
            ),
            "action": "end",
            "next_question_id": None,
            "advance_segment": False,
            "show_code_editor": False,
            "editor_mode": "none",
            "evaluation_signal": "unknown"
        }

    current_segment = plan[
        current_segment_index
    ]

    segment_type = current_segment.get(
        "type",
        "general"
    )

    segment_focus = current_segment.get(
        "focus",
        "general assessment"
    )

    planned_questions = current_segment.get(
        "questions",
        []
    )

    agenda = "\n".join(
        [
            f"- {q.get('question_id')}: "
            f"{q.get('question_text')}"
            for q in planned_questions
        ]
    )

    recent_transcript = "\n".join(
        [
            f"{entry.get('speaker', 'unknown').capitalize()}: "
            f"{entry.get('text', '')}"
            for entry in transcript[-8:]
        ]
    )

    current_question_id = (
        current_question_id
        or "unknown"
    )

    interviewer_prompt = f"""
{MASTER_INTERVIEW_PROMPT}

============================================================
LIVE INTERVIEW
============================================================

CURRENT SEGMENT INDEX:
{current_segment_index}

CURRENT SEGMENT TYPE:
{segment_type}

CURRENT SEGMENT FOCUS:
{segment_focus}

CURRENT QUESTION ID:
{current_question_id}

CURRENT QUESTION:
{question}

QUESTIONS ALREADY ASKED:
{json.dumps(asked_question_ids)}

FOLLOW-UPS ALREADY ASKED FOR CURRENT QUESTION:
{follow_up_count}

RECENT TRANSCRIPT:
{recent_transcript}

CURRENT CODE:
{current_code if current_code else "No code submitted."}

SECONDS SINCE ACTIVITY:
{seconds_since_last_activity}

TRIGGER:
{trigger_reason}

SEGMENT AGENDA:
{agenda}

============================================================
LIVE DECISION
============================================================

Determine internally:

1. Did the candidate answer?
2. Is the answer sufficient?
3. Is clarification required?
4. Is another follow-up useful, given the follow-up count and the answer's evidence?
5. Should the next planned question be asked?
6. Should the segment advance?
7. Should the interview end?

Do NOT expose reasoning.

============================================================
FOLLOW-UP RULES
============================================================

Ask no more than one question in each interviewer response.

The application allows at most three follow-ups for one planned question.
Use the follow-up count supplied above. Prefer two or three follow-ups when
they cover different useful dimensions such as the candidate's action,
reasoning, trade-offs, impact, or reflection. Do not manufacture follow-ups
when the answer is clearly sufficient or the candidate is stuck.

Never ask more than one question in interviewer_line.

If the candidate already provided sufficient evidence,
move forward.

Never repeat an already asked question.

============================================================
CODE / PRACTICAL EDITOR
============================================================

Use:

editor_mode = "code"

when actual code implementation is required.

Use:

editor_mode = "pseudocode"

when pseudocode is appropriate.

Use:

editor_mode = "architecture"

when the candidate needs to design a system or architecture.

Otherwise:

editor_mode = "none"

show_code_editor must be true only when an editor is genuinely
useful.

============================================================
SILENCE
============================================================

If the trigger indicates silence:

Do not assume an answer.

Ask whether the candidate needs:

- clarification
- more time

Do not score silence as poor performance.

============================================================
CODING
============================================================

Never solve the coding problem.

Never provide implementation.

Wait for candidate code before evaluating implementation.

============================================================
OUTPUT
============================================================

Return ONLY JSON.

Schema:

{{
    "interviewer_line": "",
    "action": "continue",
    "next_question_id": null,
    "advance_segment": false,
    "evaluation_signal": "unknown",
    "show_code_editor": false,
    "editor_mode": "none"
}}

Allowed actions:

continue
follow_up
next_question
advance_segment
end

Allowed evaluation signals:

weak
below_average
average
strong
exceptional
unknown

The interviewer_line must contain ONLY what should be
spoken to the candidate.

Keep it concise and natural.
"""

    response = _generate_content(
        interviewer_prompt
    )

    result = _parse_json_response(
        response
    )

    # --------------------------------------------------------
    # SAFETY NORMALIZATION
    # --------------------------------------------------------

    result.setdefault(
        "interviewer_line",
        ""
    )

    result.setdefault(
        "action",
        "continue"
    )

    result.setdefault(
        "next_question_id",
        None
    )

    result.setdefault(
        "advance_segment",
        False
    )

    result.setdefault(
        "evaluation_signal",
        "unknown"
    )

    result.setdefault(
        "show_code_editor",
        False
    )

    result.setdefault(
        "editor_mode",
        "none"
    )

    allowed_actions = {
        "continue",
        "follow_up",
        "next_question",
        "advance_segment",
        "end"
    }

    if result["action"] not in allowed_actions:

        result["action"] = "continue"

    allowed_signals = {
        "weak",
        "below_average",
        "average",
        "strong",
        "exceptional",
        "unknown"
    }

    if result["evaluation_signal"] not in allowed_signals:

        result["evaluation_signal"] = "unknown"

    allowed_editor_modes = {
        "none",
        "code",
        "pseudocode",
        "architecture"
    }

    if result["editor_mode"] not in allowed_editor_modes:

        result["editor_mode"] = "none"

    if result["editor_mode"] != "none":

        result["show_code_editor"] = True

    return result


# ============================================================
# GENERATE INTERVIEW REPORT
# ============================================================

def generate_report(
    plan: list,
    full_transcript: list,
    code_history: list,
    engagement_log: list
) -> dict:

    transcript_by_segment = {}

    for entry in full_transcript:

        segment_index = entry.get(
            "segment_index",
            0
        )

        transcript_by_segment.setdefault(
            segment_index,
            []
        ).append(entry)

    report_prompt = f"""
{MASTER_INTERVIEW_PROMPT}

============================================================
POST-INTERVIEW EVALUATION
============================================================

You are now the senior interview evaluator.

Analyze the complete interview.

Use ONLY evidence from:

- interview plan
- transcript
- candidate code/work
- engagement data as contextual information

Never invent candidate abilities.

============================================================
EVIDENCE RULE
============================================================

Only evaluate competencies that were actually assessed.

If insufficient evidence exists:

mark the competency as:

not_demonstrated

Do NOT assume that absence of evidence means failure.

============================================================
COMPETENCIES
============================================================

Possible areas include:

- technical competence
- problem solving
- analytical reasoning
- practical ability
- communication
- behavioral competency
- leadership
- role-specific competency
- coding
- architecture
- decision making

Only include relevant competencies.

============================================================
SCORING
============================================================

Final competency scores:

0-100

Confidence:

high
medium
low

Status:

demonstrated
partially_demonstrated
not_demonstrated

============================================================
ENGAGEMENT DATA
============================================================

Engagement data may provide contextual information.

Do NOT use:

- silence duration
- response latency
- pauses
- interaction frequency

as evidence of competence unless directly relevant and
supported by actual interview evidence.

============================================================
FINAL RECOMMENDATION
============================================================

Choose one:

strong_yes
yes
borderline
no
strong_no

Base the recommendation on:

- role requirements
- evidence
- demonstrated competencies
- missing evidence
- interview difficulty

============================================================
INTERVIEW PLAN
============================================================

{json.dumps(plan, indent=2)}

============================================================
TRANSCRIPT
============================================================

{json.dumps(transcript_by_segment, indent=2)}

============================================================
CODE HISTORY
============================================================

{json.dumps(
    code_history[-10:]
    if code_history
    else [],
    indent=2
)}

============================================================
ENGAGEMENT
============================================================

{json.dumps(
    engagement_log[-30:]
    if engagement_log
    else [],
    indent=2
)}

============================================================
OUTPUT
============================================================

Return ONLY valid JSON.

Schema:

{{
    "overall_score": 0,

    "recommendation": {{
        "decision": "",
        "confidence": "",
        "reason": ""
    }},

    "competencies": [
        {{
            "name": "",
            "score": 0,
            "confidence": "",
            "status": "",
            "evidence": [],
            "strengths": [],
            "gaps": []
        }}
    ],

    "segments": [
        {{
            "segment_id": "",
            "score": 0,
            "summary": "",
            "evidence": []
        }}
    ],

    "communication": {{
        "score": 0,
        "clarity": "",
        "structure": "",
        "technical_explanation": ""
    }},

    "behavioral": {{
        "score": 0,
        "strengths": [],
        "concerns": []
    }},

    "technical": {{
        "score": 0,
        "strengths": [],
        "weaknesses": []
    }},

    "improvements": [
        {{
            "area": "",
            "problem": "",
            "recommendation": ""
        }}
    ],

    "strength": "",

    "biggest_concern": "",

    "final_summary": ""
}}
"""

    response = _generate_content(
        report_prompt
    )

    return _parse_json_response(
        response
    )


# ============================================================
# HEALTH CHECK
# ============================================================

def check_gemini_configuration() -> dict:

    return {
        "configured": client is not None,
        "api_key_present": bool(API_KEY),
        "model": MODEL_NAME
    }


# ============================================================
# PUBLIC API
# ============================================================

__all__ = [
    "generate_interview_options",
    "generate_interview_plan",
    "get_interviewer_response",
    "generate_report",
    "check_gemini_configuration"
]