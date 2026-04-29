"""
services/skill_extractor.py
Extracts structured skill lists from a Job Description and Resume using Gemini Flash.
"""
import json
import logging
import re
from google import genai
from google.genai import types
from django.conf import settings

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


EXTRACT_PROMPT = """You are a precise skill extractor. Analyse the Job Description and Resume below.

Return ONLY valid JSON (no markdown, no explanation) in this exact shape:
{{
  "jd_skills": [
    {{"skill": "Python", "importance": "required", "context": "3+ years required"}}
  ],
  "resume_skills": [
    {{"skill": "Python", "confidence": 0.9, "evidence": "5 years at Acme building APIs"}}
  ]
}}

Rules:
- importance: "required" | "preferred" | "bonus"
- confidence: 0.0-1.0 based on how explicitly the skill is demonstrated
- Extract concrete technical skills (languages, frameworks, tools, concepts)
- Normalise skill names (e.g. "React.js" -> "React", "Postgres" -> "PostgreSQL")
- Include at most 12 skills per list

JOB DESCRIPTION:
{jd_text}

RESUME:
{resume_text}"""


def extract_skills(jd_text: str, resume_text: str) -> dict:
    """Returns dict with keys: jd_skills, resume_skills"""
    prompt = EXTRACT_PROMPT.format(jd_text=jd_text[:4000], resume_text=resume_text[:4000])
    try:
        response = _get_client().models.generate_content(
            model="gemini-2.5-flash",
            contents=prompt,
            config=types.GenerateContentConfig(
                response_mime_type="application/json",
                temperature=0.1,
            ),
        )
        data = json.loads(_clean_json(response.text))
        return {
            "jd_skills":     data.get("jd_skills", []),
            "resume_skills": data.get("resume_skills", []),
        }
    except Exception as e:
        logger.error("Skill extraction failed: %s", e)
        raise
