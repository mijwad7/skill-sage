"""
services/gap_analyser.py
Pure Python — no LLM needed.
Compares JD skills vs Resume skills and returns a ranked gap list.
"""

IMPORTANCE_WEIGHT = {"required": 3, "preferred": 2, "bonus": 1}
CONFIDENCE_THRESHOLD = 0.65  # Resume confidence below this = skill is a "gap"


def analyse_gaps(jd_skills: list, resume_skills: list) -> list:
    """
    Returns an ordered list of skill names to assess, ranked by:
    1. JD importance (required first)
    2. Resume confidence (lowest first — biggest gap first)

    Only includes skills that appear in the JD and are either:
    - Missing from resume entirely
    - Present but with low confidence (< CONFIDENCE_THRESHOLD)
    """
    resume_map = {s["skill"].lower(): s for s in resume_skills}

    gaps = []
    for jd_skill in jd_skills:
        name = jd_skill["skill"]
        key  = name.lower()
        importance = jd_skill.get("importance", "preferred")
        imp_weight = IMPORTANCE_WEIGHT.get(importance, 1)

        resume_entry = resume_map.get(key)
        if resume_entry is None:
            # Not on resume at all — full gap
            confidence = 0.0
        else:
            confidence = resume_entry.get("confidence", 0.5)

        if confidence < CONFIDENCE_THRESHOLD:
            gaps.append({
                "skill":      name,
                "importance": importance,
                "imp_weight": imp_weight,
                "confidence": confidence,
                "evidence":   resume_entry.get("evidence", "") if resume_entry else "",
            })

    # Sort: required first, then by ascending confidence (weakest skill first)
    gaps.sort(key=lambda g: (-g["imp_weight"], g["confidence"]))

    # Return up to 6 skills — keeps assessment to ~18 questions max
    return [g["skill"] for g in gaps[:6]]


def get_resume_confidence(skill_name: str, resume_skills: list) -> float:
    """Helper used by scoring engine."""
    for s in resume_skills:
        if s["skill"].lower() == skill_name.lower():
            return s.get("confidence", 0.5)
    return 0.0
