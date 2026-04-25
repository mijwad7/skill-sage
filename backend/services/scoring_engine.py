"""
services/scoring_engine.py
Computes final 0–100 scores per skill.
Formula: resume_confidence (20%) + assessment_performance (65%) + consistency (15%)
"""
import statistics
from services.gap_analyser import get_resume_confidence


def compute_all_scores(session) -> dict:
    """Returns {skill_name: score_0_to_100} for every assessed skill."""
    scores = {}
    for skill in session.gap_list:
        history = session.skill_histories.get(skill, [])
        scores[skill] = _compute_skill_score(skill, history, session)
    return scores


def _compute_skill_score(skill: str, history: list, session) -> int:
    if not history:
        return 0

    # Base the score entirely on assessment performance to match user expectations
    qa_scores = [h["score"] for h in history]
    assessment_score = (sum(qa_scores) / len(qa_scores)) * 10  # 1–10 → 0–100

    return round(assessment_score)


def score_band(score: int) -> str:
    if score >= 85: return "Expert"
    if score >= 65: return "Proficient"
    if score >= 40: return "Developing"
    return "Beginner"


def score_color(score: int) -> str:
    if score >= 85: return "#7c3aed"
    if score >= 65: return "#0d9488"
    if score >= 40: return "#d97706"
    return "#dc2626"
