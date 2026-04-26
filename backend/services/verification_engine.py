"""
services/verification_engine.py
Detects mismatches between resume claims and assessment performance.
"""
import logging

logger = logging.getLogger(__name__)

def get_verification_insights(session):
    insights = []
    
    # Map resume skills for lookup
    resume_map = {s["skill"].lower(): s for s in session.resume_skills}
    jd_map = {s["skill"].lower(): s for s in session.jd_skills}
    
    for skill_name, score in session.scores.items():
        s_lower = skill_name.lower()
        resume_skill = resume_map.get(s_lower)
        jd_skill = jd_map.get(s_lower)
        
        # 1. Inflated Claim: High resume confidence + Low assessment score
        if resume_skill and resume_skill.get("confidence", 0) > 0.75 and score < 45:
            insights.append({
                "type": "inflated_claim",
                "skill": skill_name,
                "label": "Inflated Claim",
                "message": f"{skill_name} heavily emphasized on resume but candidate demonstrated only foundational understanding.",
                "color": "#dc2626", # red
                "icon": "⚠"
            })
            continue

        # 2. Verified Strength: High resume confidence + High assessment score
        if resume_skill and resume_skill.get("confidence", 0) > 0.7 and score >= 75:
            insights.append({
                "type": "verified_strength",
                "skill": skill_name,
                "label": "Verified Strength",
                "message": f"{skill_name} listed on resume and demonstrated at a proficient/expert level.",
                "color": "#0d9488", # teal
                "icon": "✔"
            })
            continue

        # 3. Undervalued Strength: Low resume confidence + High assessment score
        if resume_skill and resume_skill.get("confidence", 0) < 0.4 and score >= 80:
             insights.append({
                "type": "undervalued_strength",
                "skill": skill_name,
                "label": "Undervalued Strength",
                "message": f"{skill_name} only briefly mentioned on resume yet candidate showed deep mastery.",
                "color": "#7c3aed", # purple
                "icon": "⭐"
            })
             continue

        # 4. Hidden Gap: Important JD skill + Low score + Not on resume or low confidence
        if jd_skill and jd_skill.get("importance") == "required" and score < 40:
             if not resume_skill or resume_skill.get("confidence", 0) < 0.3:
                 insights.append({
                    "type": "hidden_gap",
                    "skill": skill_name,
                    "label": "Hidden Gap",
                    "message": f"{skill_name} not mentioned deeply on resume, and assessment confirmed a significant gap for this core requirement.",
                    "color": "#d97706", # amber
                    "icon": "✖"
                })

    return insights[:4] # Limit to top 4 insights
