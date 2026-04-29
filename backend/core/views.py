"""
core/views.py
All API endpoints. Thin controllers — business logic lives in services/.
"""
import logging
from django.http import JsonResponse
from django.views.decorators.csrf import csrf_exempt
from django.views.decorators.http import require_http_methods
from django.conf import settings
import json
import io
import mimetypes
import pypdf
import docx
from google import genai
from google.genai import types

from core.models import Session
from services import skill_extractor, gap_analyser, assessment_agent, scoring_engine, plan_generator
from services.verification_engine import get_verification_insights

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

        learning_plan_data = session.learning_plan or {}
        roadmap = learning_plan_data.get("roadmap", []) if isinstance(learning_plan_data, dict) else learning_plan_data
        recommendation = learning_plan_data.get("recommendation", None) if isinstance(learning_plan_data, dict) else None

        return JsonResponse({
            "session_id":    str(session.id),
            "status":        "complete",
            "scored_skills": scored_skills,
            "verification_insights": get_verification_insights(session),
            "learning_plan": roadmap,
            "hire_recommendation": recommendation,
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


# ── POST /api/extract-text/ ──────────────────────────────────────────────────

@csrf_exempt
@require_http_methods(["POST", "OPTIONS"])
def extract_text_view(request):
    if request.method == "OPTIONS":
        return JsonResponse({}, status=200)
    try:
        if 'file' not in request.FILES:
            return JsonResponse({"error": "No file uploaded."}, status=400)
        
        uploaded_file = request.FILES['file']
        file_name = uploaded_file.name.lower()
        file_content = uploaded_file.read()
        
        text = ""
        
        if file_name.endswith('.pdf'):
            reader = pypdf.PdfReader(io.BytesIO(file_content))
            for page in reader.pages:
                page_text = page.extract_text()
                if page_text:
                    text += page_text + "\n"
        elif file_name.endswith('.docx'):
            doc = docx.Document(io.BytesIO(file_content))
            for para in doc.paragraphs:
                text += para.text + "\n"
        elif file_name.endswith(('.png', '.jpg', '.jpeg', '.webp')):
            # Use Gemini to extract text from images
            key = settings.GEMINI_API_KEY
            if not key:
                raise RuntimeError("GEMINI_API_KEY is not set.")
            client = genai.Client(api_key=key)
            mime_type, _ = mimetypes.guess_type(file_name)
            if not mime_type:
                mime_type = "image/jpeg"
                
            image_part = types.Part.from_bytes(data=file_content, mime_type=mime_type)
            response = client.models.generate_content(
                model="gemini-2.5-flash",
                contents=["Extract and return all the readable text from this image as raw text. Do not add any conversational filler. Structure it exactly as it appears in the image.", image_part]
            )
            text = response.text
        else:
            # Fallback for plain text
            try:
                text = file_content.decode('utf-8')
            except UnicodeDecodeError:
                return JsonResponse({"error": "Unsupported file format. Please upload a PDF, DOCX, TXT, or Image file."}, status=400)
        
        return JsonResponse({"text": text.strip()})
    except Exception as e:
        logger.exception("extract_text error")
        return JsonResponse({"error": str(e)}, status=500)
