# Skill Assessment — AI-Powered Interview Platform

An AI-driven skill gap analyser that interviews candidates skill-by-skill and generates a personalised learning roadmap.

## What it does

1. **Paste a Job Description + Resume** — the AI extracts required and held skills
2. **AI Interview** — adaptive questions per skill (easy → medium → hard), powered by Gemini
3. **Scored Results** — each skill is scored 0–100 with a band label
4. **Learning Roadmap** — week-by-week plan with curated free resources

## ✨ Premium Features & Enhancements

This project goes beyond a standard CRUD application by integrating advanced AI reasoning and premium UX features:

- **🕵️ Claim vs. Reality Engine**: Automatically cross-references resume claims against actual assessment performance to detect *Inflated Claims*, *Hidden Gaps*, and *Verified Strengths*.
- **🧠 Adaptive Reasoning Trace**: Exposes the AI's internal logic during the interview (e.g., *"Candidate missed state synchronization. Escalating to a scenario-based question."*) so users can see the difficulty adapting in real-time.
- **🎯 AI-Driven Hire Recommendation**: Synthesizes the final scores against the Job Description to output a definitive role readiness percentage and an actionable HR recommendation (e.g., *"Hire with targeted upskilling"*).
- **🎙️ Hands-Free Interviewing**: Integrated Web Speech APIs provide seamless Text-to-Speech (TTS) and Speech-to-Text (STT) capabilities for a natural, conversational interview experience.
- **🔗 Recruiter Share Links**: Generates secure, unguessable URLs for friction-free sharing of candidate results with hiring managers.
- **📱 Fluid Glassmorphism UI**: A fully responsive, modern neon-gradient aesthetic featuring dynamic micro-animations and intelligent loading sequences that transform dead waiting time into a showcase of the AI's processing logic.

## Assessment Depths

| Mode | Questions/skill | Use case |
|---|---|---|
| ⚡ Snapshot | 1 | Quick scan |
| 🎯 Standard | 3 | Balanced (default) |
| 🔬 Deep Dive | 5 | Thorough evaluation |

---

## Tech Stack

| Layer | Technology |
|---|---|
| Backend | Django 4.2 + Django REST Framework |
| AI | Google Gemini 2.5 Flash Lite (via `google-genai`) |
| Frontend | React 18 + Vite + React Router |
| Database | SQLite (dev) / PostgreSQL (prod) |

---

## Local Setup

### Prerequisites
- Python 3.9+
- Node.js 18+
- A free [Google AI Studio API key](https://aistudio.google.com/apikey)

### 1. Clone the repo

```bash
git clone <your-repo-url>
cd skills
```

### 2. Backend setup

```bash
cd backend

# Create and activate virtual environment
python -m venv venv
venv\Scripts\activate        # Windows
# source venv/bin/activate   # macOS / Linux

# Install dependencies
pip install -r requirements.txt

# Configure environment
cp .env.example .env
# Edit .env and add your GEMINI_API_KEY

# Run migrations
python manage.py migrate

# Start backend
python manage.py runserver
```

Backend runs at `http://127.0.0.1:8000`

### 3. Frontend setup

```bash
cd frontend

# Install dependencies
npm install

# Start dev server
npm run dev
```

Frontend runs at `http://localhost:5173`

---

## Project Structure

```
skills/
├── backend/
│   ├── backend/          # Django settings, URLs, WSGI
│   ├── core/             # Session model, views, migrations
│   ├── services/         # AI service layer
│   │   ├── skill_extractor.py   # Extracts skills from JD + resume
│   │   ├── gap_analyser.py      # Identifies skill gaps to assess
│   │   ├── assessment_agent.py  # Adaptive interview agent
│   │   ├── scoring_engine.py    # Computes 0-100 scores
│   │   └── plan_generator.py    # Generates learning roadmap
│   ├── requirements.txt
│   └── .env.example
└── frontend/
    ├── src/
    │   ├── api/          # API client
    │   ├── components/   # Shared UI components
    │   └── pages/        # UploadPage, AssessmentPage, ResultsPage
    └── package.json
```

---

## Environment Variables

| Variable | Description |
|---|---|
| `DJANGO_SECRET_KEY` | Django secret key (generate a new one for production) |
| `DEBUG` | `True` for dev, `False` for production |
| `ALLOWED_HOSTS` | Comma-separated allowed hostnames |
| `GEMINI_API_KEY` | Google Gemini API key from [AI Studio](https://aistudio.google.com/apikey) |
| `CORS_ALLOWED_ORIGINS` | Comma-separated frontend origins |
| `DATABASE_URL` | PostgreSQL URL (optional — uses SQLite if not set) |

---

## API Endpoints

| Method | Path | Description |
|---|---|---|
| `POST` | `/api/sessions/` | Create session, extract skills, get first question |
| `GET` | `/api/sessions/<id>/` | Get session state |
| `POST` | `/api/sessions/<id>/message/` | Send answer, receive next question |
| `GET` | `/api/sessions/<id>/results/` | Get final scores + learning plan |
