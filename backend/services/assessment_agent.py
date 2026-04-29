"""
services/assessment_agent.py
Production-quality assessment agent.

Key design decisions:
- ONE API call per turn (combined eval + question generation) — cuts latency in half
- No max_output_tokens cap — questions are never truncated
- Robust JSON extraction with 3 fallback strategies
- Exponential backoff retry for transient API failures
"""
import json
import logging
import re
import time
from google import genai
from google.genai import types
from django.conf import settings

logger = logging.getLogger(__name__)
_client = None

DIFFICULTY_ORDER = ["easy", "medium", "hard"]


# ── Client ───────────────────────────────────────────────────────────────────

def _get_client():
    global _client
    if _client is None:
        key = settings.GEMINI_API_KEY
        if not key:
            raise RuntimeError("GEMINI_API_KEY is not set. Add it to your .env file.")
        _client = genai.Client(api_key=key)
    return _client


# ── JSON helpers ─────────────────────────────────────────────────────────────

def _extract_json(text: str) -> dict:
    """
    Three-stage robust JSON extraction from LLM output.
    Handles raw JSON, markdown fences, and partial wrapping.
    """
    # Stage 1: direct parse
    try:
        return json.loads(text.strip())
    except (json.JSONDecodeError, ValueError):
        pass

    # Stage 2: strip markdown fences then parse
    cleaned = re.sub(r"```(?:json)?", "", text).strip().strip("`").strip()
    try:
        return json.loads(cleaned)
    except (json.JSONDecodeError, ValueError):
        pass

    # Stage 3: find first {...} block in the text
    match = re.search(r"\{.*\}", cleaned, re.DOTALL)
    if match:
        try:
            return json.loads(match.group())
        except (json.JSONDecodeError, ValueError):
            pass

    raise ValueError(f"No valid JSON found in response: {text[:300]}")


# ── API call with retry ───────────────────────────────────────────────────────

def _call_api(prompt: str, json_mode: bool = False, retries: int = 3) -> str:
    """Make a Gemini API call with exponential backoff retry."""
    config = types.GenerateContentConfig(
        temperature=0.3 if json_mode else 0.7,
        **({"response_mime_type": "application/json"} if json_mode else {}),
    )
    last_exc = None
    for attempt in range(retries):
        try:
            response = _get_client().models.generate_content(
                model="gemini-2.5-flash",
                contents=prompt,
                config=config,
            )
            return response.text
        except Exception as exc:
            last_exc = exc
            if attempt < retries - 1:
                wait = 2 ** attempt  # 1s, 2s, 4s
                logger.warning("API attempt %d/%d failed: %s — retrying in %ds", attempt + 1, retries, exc, wait)
                time.sleep(wait)
    raise last_exc


# ── Prompt templates ──────────────────────────────────────────────────────────

# Used for the FIRST question of the assessment
FIRST_QUESTION_PROMPT = """You are a professional technical interviewer.
Generate exactly ONE complete, clear question to begin assessing the candidate.
No preamble. No greeting. Output only the question text.

Skill: {skill}
Difficulty: easy (fundamental concept, definition, or basic usage)
Candidate's resume evidence: {evidence}

Question:"""


# Used for every subsequent turn — evaluates the last answer AND generates the next question
# in a single call. This halves latency vs two separate calls.
COMBINED_PROMPT = """You are a professional technical interviewer conducting a skills assessment.

## Task 1 — Evaluate the candidate's answer

Skill assessed: {current_skill}
Difficulty: {current_difficulty}
Question: {current_question}
Candidate's answer: {candidate_answer}

Scoring guide:
  1-3  → incorrect, irrelevant, or extremely superficial
  4-6  → partially correct; missing key concepts or flawed reasoning
  7-8  → mostly correct; minor omissions
  9-10 → comprehensive, accurate, and well-reasoned

## Task 2 — Generate the next interview question

Next skill: {next_skill}
Difficulty: {next_difficulty}
Candidate's resume evidence for {next_skill}: {next_evidence}
Previous questions already asked about {next_skill} (DO NOT repeat these topics):
{next_history_text}

The question MUST be fully written out — never cut it off mid-sentence.

## Response format — return ONLY this JSON, no markdown:
{{
  "evaluation": {{
    "score": <integer 1-10>,
    "feedback": "<one clear, specific sentence about the answer quality>",
    "key_gap": "<the main concept missing, or null if answer was complete>",
    "insight": "<one sentence internal reasoning of how you evaluated this and adapted your next question (e.g. 'Strong conceptual grasp detected. Escalating to architecture-level probing.')>"
  }},
  "next_question": "<your complete question text>"
}}"""


# ── Public API ────────────────────────────────────────────────────────────────

def generate_first_question(session) -> str:
    """Called once to kick off the assessment."""
    skill = session.current_skill()
    evidence = _evidence(skill, session)
    prompt = FIRST_QUESTION_PROMPT.format(skill=skill, evidence=evidence or "Not mentioned on resume.")
    try:
        return _call_api(prompt, json_mode=False).strip()
    except Exception as exc:
        logger.error("First question generation failed: %s", exc)
        return f"Can you explain what {skill} is and describe a situation where you've used it?"


def process_turn(session, user_answer: str) -> dict:
    """
    Core agent loop. Called on every candidate message.
    Makes ONE API call that both evaluates the current answer and generates the next question.
    """
    skill = session.current_skill()

    # ── Pre-compute next skill/difficulty BEFORE the API call ────────────────
    # We determine what to ask next optimistically (before seeing the score).
    # The score may change the path (e.g., low score skips skill, high score upgrades difficulty).
    # We handle those cases after getting the response.
    q_after_this = session.questions_this_skill + 1
    max_q = session.questions_per_skill
    optimistic_skill_done = q_after_this >= max_q

    curr_diff_idx = DIFFICULTY_ORDER.index(session.current_difficulty)
    # Optimistically assume medium score → same difficulty
    optimistic_next_difficulty = session.current_difficulty

    if optimistic_skill_done:
        optimistic_next_skill_index = session.current_skill_index + 1
        optimistic_next_difficulty = "easy"
    else:
        optimistic_next_skill_index = session.current_skill_index

    # Check if assessment will be complete after this turn
    assessment_complete_after = optimistic_next_skill_index >= len(session.gap_list)

    if not assessment_complete_after:
        next_skill_name = session.gap_list[optimistic_next_skill_index]
        next_history = session.skill_histories.get(next_skill_name, [])
        next_evidence = _evidence(next_skill_name, session)
        next_history_text = "\n".join(
            f"Q: {h['question']}" for h in next_history
        ) or "None yet."

        combined_prompt = COMBINED_PROMPT.format(
            current_skill=skill,
            current_difficulty=session.current_difficulty,
            current_question=session.pending_question,
            candidate_answer=user_answer[:3000],
            next_skill=next_skill_name,
            next_difficulty=optimistic_next_difficulty,
            next_evidence=next_evidence or "Not mentioned on resume.",
            next_history_text=next_history_text,
        )

        try:
            raw = _call_api(combined_prompt, json_mode=True)
            combined = _extract_json(raw)
            evaluation = _parse_evaluation(combined.get("evaluation", {}))
            pre_generated_question = combined.get("next_question", "").strip()
        except Exception as exc:
            logger.error("Combined API call failed: %s", exc)
            evaluation = {"score": 5, "feedback": "Answer noted.", "key_gap": None, "insight": "Fallback logic engaged due to API error."}
            pre_generated_question = ""
    else:
        # Last question of assessment — just evaluate, no next question needed
        try:
            evaluation = _evaluate_only(skill, session.pending_question, user_answer, session.current_difficulty)
        except Exception as exc:
            logger.error("Final evaluation failed: %s", exc)
            evaluation = {"score": 5, "feedback": "Assessment complete.", "key_gap": None, "insight": "Final evaluation fallback."}
        pre_generated_question = ""

    # ── Update session state based on ACTUAL score ────────────────────────────
    score = evaluation["score"]

    histories = dict(session.skill_histories)
    histories.setdefault(skill, []).append({
        "question":   session.pending_question,
        "answer":     user_answer,
        "score":      score,
        "feedback":   evaluation["feedback"],
        "key_gap":    evaluation["key_gap"],
        "insight":    evaluation.get("insight", "Adapted question based on response."),
        "difficulty": session.current_difficulty,
    })
    session.skill_histories = histories
    session.questions_this_skill += 1

    # Adapt difficulty based on score
    if score >= 8:
        session.current_difficulty = DIFFICULTY_ORDER[min(curr_diff_idx + 1, 2)]
    elif score <= 3:
        session.questions_this_skill = session.questions_per_skill  # force skill done

    # Advance skill if done
    if session.questions_this_skill >= session.questions_per_skill:
        session.current_skill_index += 1
        session.current_difficulty = "easy"
        session.questions_this_skill = 0
        session.pending_question = ""

    session.save()

    # ── Return if assessment is complete ─────────────────────────────────────
    if session.all_skills_done():
        session.status = "scoring"
        session.save()
        return {"type": "complete", "feedback": evaluation["feedback"], "insight": evaluation.get("insight")}

    # ── Determine if the pre-generated question is still valid ───────────────
    actual_next_skill = session.current_skill()
    actual_next_difficulty = session.current_difficulty

    question_is_valid = (
        pre_generated_question
        and actual_next_skill == next_skill_name
        and actual_next_difficulty == optimistic_next_difficulty
    ) if not assessment_complete_after else False

    if question_is_valid:
        next_question = pre_generated_question
    else:
        # Score caused an unexpected path (e.g., high score → harder difficulty, or
        # low score → forced next skill). Make a focused single call.
        logger.info("Optimistic prediction missed (score=%d); regenerating question for %s/%s",
                    score, actual_next_skill, actual_next_difficulty)
        try:
            next_question = _generate_single_question(
                actual_next_skill,
                actual_next_difficulty,
                session.skill_histories.get(actual_next_skill, []),
                _evidence(actual_next_skill, session),
            )
        except Exception as exc:
            logger.error("Fallback question generation failed: %s", exc)
            next_question = f"Can you describe your experience with {actual_next_skill} and a project where you applied it?"

    session.pending_question = next_question
    session.save()

    return {
        "type":       "question",
        "content":    next_question,
        "feedback":   evaluation["feedback"],
        "insight":    evaluation.get("insight", "Adapted question based on response."),
        "skill":      actual_next_skill,
        "progress":   session.progress(),
        "difficulty": actual_next_difficulty,
    }


# ── Private helpers ───────────────────────────────────────────────────────────

EVAL_ONLY_PROMPT = """Evaluate this answer. Return ONLY valid JSON, no markdown.

Skill: {skill} | Difficulty: {difficulty}
Question: {question}
Answer: {answer}

Score 1-10: 1-3=wrong/superficial, 4-6=partial, 7-8=mostly correct, 9-10=excellent

{{"score": N, "feedback": "one sentence", "key_gap": "missing concept or null", "insight": "one sentence reasoning"}}"""

SINGLE_QUESTION_PROMPT = """You are a technical interviewer. Generate exactly ONE complete question.
Output only the question text — no preamble, no labels.

Skill: {skill}
Difficulty: {difficulty} (easy=concept/definition, medium=debug/explain, hard=design/tradeoffs)
Resume evidence: {evidence}
Already asked (avoid repeating): {history_text}

Question:"""


def _evaluate_only(skill: str, question: str, answer: str, difficulty: str) -> dict:
    prompt = EVAL_ONLY_PROMPT.format(
        skill=skill, difficulty=difficulty,
        question=question, answer=answer[:3000],
    )
    raw = _call_api(prompt, json_mode=True)
    return _parse_evaluation(_extract_json(raw))


def _generate_single_question(skill: str, difficulty: str, history: list, evidence: str) -> str:
    history_text = "; ".join(f'"{h["question"][:80]}"' for h in history) or "None"
    prompt = SINGLE_QUESTION_PROMPT.format(
        skill=skill, difficulty=difficulty,
        evidence=evidence or "Not mentioned on resume.",
        history_text=history_text,
    )
    return _call_api(prompt, json_mode=False).strip()


def _parse_evaluation(data: dict) -> dict:
    """Safely parse evaluation dict, providing defaults for missing/bad fields."""
    try:
        score = max(1, min(10, int(data.get("score", 5))))
    except (TypeError, ValueError):
        score = 5
    return {
        "score":    score,
        "feedback": str(data.get("feedback", "Answer noted.")).strip() or "Answer noted.",
        "key_gap":  data.get("key_gap"),
        "insight":  str(data.get("insight", "Adapted question based on response.")).strip()
    }


def _evidence(skill: str, session) -> str:
    for s in session.resume_skills:
        if s["skill"].lower() == skill.lower():
            return s.get("evidence", "")
    return ""
