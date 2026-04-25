"""
core/views.py
All API endpoints. Thin controllers — business logic lives in services/.
"""
import logging
from django.http import JsonResponse
from django.views.decorators.csrf import csrf_exempt
from django.views.decorators.http import require_http_methods
import json

from core.models import Session
from services import skill_extractor, gap_analyser, assessment_agent, scoring_engine, plan_generator

logger = logging.getLogger(__name__)


# ── POST /api/sessions/ ──────────────────────────────────────────────────────

@csrf_exempt
@require_http_methods(["POST", "OPTIONS"])
def create_session(request):
    if request.method == "OPTIONS":
        return JsonResponse({}, status=200)
    try:
        body = json.loads(request.body)
        jd_text     = body.get("jd_text", "").strip()
        resume_text = body.get("resume_text", "").strip()
        depth       = body.get("depth", "standard")

        # Validate depth
        valid_depths = ["snapshot", "standard", "deep"]
        if depth not in valid_depths:
            depth = "standard"

        if not jd_text or not resume_text:
            return JsonResponse({"error": "jd_text and resume_text are required."}, status=400)

        # Create session
        session = Session.objects.create(jd_text=jd_text, resume_text=resume_text, depth=depth)

        # Extract skills
        extracted = skill_extractor.extract_skills(jd_text, resume_text)
        session.jd_skills     = extracted["jd_skills"]
        session.resume_skills = extracted["resume_skills"]

        # Analyse gaps
        gaps = gap_analyser.analyse_gaps(session.jd_skills, session.resume_skills)
        session.gap_list = gaps

        if not gaps:
            # No significant gaps — skip assessment
            session.status = "complete"
            session.scores = {s["skill"]: 90 for s in session.resume_skills}
            session.save()
            return JsonResponse({
                "session_id": str(session.id),
                "status":     "complete",
                "message":    "Resume closely matches the JD — no major gaps found.",
                "gaps":       [],
            })

        # Generate the first question
        first_question = assessment_agent.generate_first_question(session)
        session.pending_question = first_question
        session.status           = "assessing"
        session.save()

        return JsonResponse({
            "session_id":     str(session.id),
            "status":         "assessing",
            "depth":          session.depth,
            "questions_per_skill": session.questions_per_skill,
            "jd_skills":      session.jd_skills,
            "resume_skills":  session.resume_skills,
            "gaps":           gaps,
            "first_question": first_question,
            "progress":       session.progress(),
        })

    except Exception as e:
        logger.exception("create_session error")
        return JsonResponse({"error": str(e)}, status=500)


# ── GET /api/sessions/<id>/ ──────────────────────────────────────────────────

@require_http_methods(["GET"])
def get_session(request, session_id):
    try:
        session = Session.objects.get(id=session_id)
        return JsonResponse({
            "session_id":    str(session.id),
            "status":        session.status,
            "gaps":          session.gap_list,
            "progress":      session.progress(),
            "scores":        session.scores,
            "current_skill": session.current_skill(),
            "difficulty":    session.current_difficulty,
        })
    except Session.DoesNotExist:
        return JsonResponse({"error": "Session not found."}, status=404)


# ── POST /api/sessions/<id>/message/ ─────────────────────────────────────────

@csrf_exempt
@require_http_methods(["POST", "OPTIONS"])
def send_message(request, session_id):
    if request.method == "OPTIONS":
        return JsonResponse({}, status=200)
    try:
        session = Session.objects.get(id=session_id)

        if session.status != "assessing":
            return JsonResponse({"error": f"Session is not in assessing state (status: {session.status})."}, status=400)

        body   = json.loads(request.body)
        answer = body.get("answer", "").strip()

        if not answer:
            return JsonResponse({"error": "answer is required."}, status=400)

        result = assessment_agent.process_turn(session, answer)

        # If assessment complete → compute scores + generate plan
        if result["type"] == "complete":
            session.refresh_from_db()
            scores = scoring_engine.compute_all_scores(session)
            session.scores = scores

            plan = plan_generator.generate_plan(session, scores)
            session.learning_plan = plan
            session.status        = "complete"
            session.save()

            result["scores"]        = scores
            result["learning_plan"] = plan

        return JsonResponse(result)

    except Session.DoesNotExist:
        return JsonResponse({"error": "Session not found."}, status=404)
    except Exception as e:
        logger.exception("send_message error")
        return JsonResponse({"error": str(e)}, status=500)


# ── GET /api/sessions/<id>/results/ ──────────────────────────────────────────

@require_http_methods(["GET"])
def get_results(request, session_id):
    try:
        session = Session.objects.get(id=session_id)

        if session.status != "complete":
            return JsonResponse({"error": "Assessment not complete yet."}, status=400)

        # Enrich scores with band labels
        scored_skills = [
            {
                "skill":        skill,
                "score":        score,
                "band":         scoring_engine.score_band(score),
                "color":        scoring_engine.score_color(score),
                "history":      session.skill_histories.get(skill, []),
            }
            for skill, score in session.scores.items()
        ]
        scored_skills.sort(key=lambda x: x["score"])  # weakest first

        return JsonResponse({
            "session_id":    str(session.id),
            "status":        "complete",
            "scored_skills": scored_skills,
            "learning_plan": session.learning_plan or [],
            "summary": {
                "total_skills":  len(scored_skills),
                "avg_score":     round(sum(s["score"] for s in scored_skills) / len(scored_skills)) if scored_skills else 0,
                "strongest":     max(scored_skills, key=lambda x: x["score"])["skill"] if scored_skills else None,
                "weakest":       min(scored_skills, key=lambda x: x["score"])["skill"] if scored_skills else None,
            },
        })

    except Session.DoesNotExist:
        return JsonResponse({"error": "Session not found."}, status=404)
    except Exception as e:
        logger.exception("get_results error")
        return JsonResponse({"error": str(e)}, status=500)
