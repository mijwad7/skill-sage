"""
services/plan_generator.py
Single LLM call that returns a full structured learning roadmap as JSON.
Uses Gemini Flash via the new google-genai SDK.
"""
import json
import logging
import re
from google import genai
from google.genai import types
from django.conf import settings
from services.scoring_engine import score_band

logger = logging.getLogger(__name__)
_client = None


def _get_client():
    global _client
    if _client is None:
        key = settings.GEMINI_API_KEY
        if not key:
            raise RuntimeError("GEMINI_API_KEY is not set. Add it to your .env file.")
        _client = genai.Client(api_key=key)
    return _client


def _clean_json(text):
    """Strips markdown fences and extra whitespace from LLM response."""
    text = re.sub(r"```(?:json)?", "", text)
    return text.strip("` \n\r\t")


PLAN_PROMPT = """You are an expert technical assessor and hiring manager. Generate a final hiring recommendation and a structured learning plan.
Return ONLY valid JSON — no markdown, no explanation.

Candidate skill scores (0-100): {scores_json}
Target role extracted from JD: {job_context}
Time available: 8 weeks

Return a JSON object in this exact shape:
{{
  "recommendation": {{
    "status": "Strong Hire" | "Hire with Upskilling" | "Borderline" | "No Hire",
    "reasoning": "A professional, 1-2 sentence HR-friendly explanation of why, highlighting verified strengths vs critical gaps."
  }},
  "roadmap": [
    {{
      "skill": "React",
      "priority": "high",
      "current_band": "Developing",
      "current_score": 45,
      "weeks_needed": 3,
      "weekly_goals": [
        "Week 1: Core hooks (useState, useEffect) - build a todo app",
        "Week 2: React Router + Context API - add routing and global state",
        "Week 3: REST API integration + deploy to Vercel"
      ],
      "resources": [
        {{"title": "Official React Docs", "url": "https://react.dev", "type": "docs"}},
        {{"title": "React Full Course - freeCodeCamp", "url": "https://www.youtube.com/watch?v=bMknfKXIFA8", "type": "video"}},
        {{"title": "The Road to React (free book)", "url": "https://www.roadtoreact.com", "type": "book"}}
      ],
      "mini_project": "Build a GitHub profile viewer: search users, show repos, save favourites to localStorage"
    }}
  ]
}}

Rules:
- priority: "high" for required JD skills with score < 50, "medium" for preferred skills or score 50-70, "low" otherwise
- Only include real, verifiable URLs
- Prioritise free resources (official docs, YouTube, free courses)
- weekly_goals must be concrete and actionable, not vague
- mini_project must be a specific build task that demonstrates the skill
- Order by priority (high first), then by current_score ascending"""


def generate_plan(session, scores: dict) -> list:
    scores_with_bands = {
        skill: {"score": score, "band": score_band(score)}
        for skill, score in scores.items()
    }

    job_context = session.jd_text[:500]

    prompt = PLAN_PROMPT.format(
        scores_json=json.dumps(scores_with_bands, indent=2),
        job_context=job_context,
    )

    try:
        response = _get_client().models.generate_content(
            model="gemini-2.5-flash",
            contents=prompt,
            config=types.GenerateContentConfig(
                response_mime_type="application/json",
                temperature=0.4,
                max_output_tokens=3000,
            ),
        )
        plan = json.loads(_clean_json(response.text))
        return plan if isinstance(plan, dict) else _fallback_plan(scores)
    except Exception as e:
        logger.error("Plan generation failed: %s", e)
        return _fallback_plan(scores)


def _fallback_plan(scores: dict) -> dict:
    """Minimal fallback if LLM call fails."""
    roadmap = [
        {
            "skill": skill,
            "priority": "high" if score < 50 else "medium",
            "current_band": score_band(score),
            "current_score": score,
            "weeks_needed": 4,
            "weekly_goals": ["Search YouTube and official docs for this skill"],
            "resources": [{"title": "Google it", "url": "https://google.com", "type": "docs"}],
            "mini_project": f"Build a small project that demonstrates {skill}",
        }
        for skill, score in scores.items()
        if score < 80
    ]
    avg_score = sum(scores.values()) / max(len(scores), 1)
    status = "Hire with Upskilling" if avg_score > 60 else "Borderline"
    return {
        "recommendation": {
            "status": status,
            "reasoning": "Fallback recommendation generated due to an AI processing error."
        },
        "roadmap": roadmap
    }
