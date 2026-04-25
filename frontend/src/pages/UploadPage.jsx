import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { api } from "../api/client";
import { Shell, Card, Button, TextArea, ErrorBanner, Spinner } from "../components/ui";

const SAMPLE_JD = `Senior Frontend Engineer — FinTech Startup

We're looking for a Senior Frontend Engineer to join our product team.

Required:
- 4+ years of experience with React and modern JavaScript (ES2020+)
- Strong knowledge of TypeScript
- Experience with REST API integration and async state management
- Proficiency with CSS-in-JS or Tailwind CSS
- Familiarity with testing frameworks (Jest, React Testing Library)

Preferred:
- Experience with Next.js and SSR concepts
- Knowledge of GraphQL
- Familiarity with CI/CD pipelines and Docker

You'll be building our customer-facing dashboard used by 50,000+ users.`;

const SAMPLE_RESUME = `Jane Smith — Frontend Developer
jane@example.com | github.com/janesmith

EXPERIENCE
Frontend Developer — Acme Corp (2021–present)
- Built React dashboards with Redux and React Query
- Integrated multiple REST APIs for real-time data display
- Wrote unit tests with Jest; 80% coverage on core modules

Junior Developer — StartupXYZ (2019–2021)
- Worked with JavaScript, HTML/CSS
- Some exposure to React, mainly jQuery-based projects

SKILLS
JavaScript, React, Redux, HTML/CSS, Jest
Basic TypeScript knowledge (self-taught, 6 months)
No professional Next.js or GraphQL experience

EDUCATION
BSc Computer Science, 2019`;

const DEPTH_LEVELS = [
  {
    id: "snapshot",
    label: "Snapshot",
    questions: 1,
    icon: "⚡",
    desc: "1 question per skill. Fast overview — ideal for quick testing.",
    color: "#10b981",
  },
  {
    id: "standard",
    label: "Standard",
    questions: 3,
    icon: "🎯",
    desc: "3 adaptive questions per skill. The recommended balanced assessment.",
    color: "#7c3aed",
  },
  {
    id: "deep",
    label: "Deep Dive",
    questions: 5,
    icon: "🔬",
    desc: "5 questions per skill — easy to hard. Thorough evaluation.",
    color: "#ef4444",
  },
];

export default function UploadPage() {
  const navigate   = useNavigate();
  const [jd, setJd]           = useState("");
  const [resume, setResume]   = useState("");
  const [depth, setDepth]     = useState("standard");
  const [loading, setLoading] = useState(false);
  const [error, setError]     = useState("");

  const loadSample = () => { setJd(SAMPLE_JD); setResume(SAMPLE_RESUME); };

  const handleSubmit = async () => {
    if (!jd.trim() || !resume.trim()) {
      setError("Please provide both the job description and resume.");
      return;
    }
    setError("");
    setLoading(true);
    try {
      const data = await api.createSession(jd, resume, depth);
      navigate(`/session/${data.session_id}`, { state: { sessionData: data } });
    } catch (e) {
      setError(e.message || "Something went wrong. Is the backend running?");
    } finally {
      setLoading(false);
    }
  };

  const selectedLevel = DEPTH_LEVELS.find(d => d.id === depth);

  return (
    <Shell>
      <div className="animate-fade-up">
        {/* Hero */}
        <div style={{ textAlign: "center", marginBottom: 48 }}>
          <div style={{
            display: "inline-flex", alignItems: "center", gap: 6,
            background: "rgba(124,58,237,0.12)", border: "1px solid rgba(124,58,237,0.3)",
            borderRadius: 99, padding: "4px 14px", fontSize: 12,
            color: "var(--purple-l)", marginBottom: 20,
          }}>
            <span style={{ width: 6, height: 6, borderRadius: "50%", background: "var(--purple-l)", display: "inline-block" }} />
            AI-Powered Skill Assessment
          </div>
          <h1 style={{ fontSize: 38, fontWeight: 600, lineHeight: 1.15, marginBottom: 14, letterSpacing: "-0.02em" }}>
            Find your skill gaps.<br />
            <span style={{ color: "var(--purple-l)" }}>Get a personalised roadmap.</span>
          </h1>
          <p style={{ fontSize: 16, color: "var(--text2)", maxWidth: 480, margin: "0 auto" }}>
            Paste a job description and your resume. Our AI agent will interview you skill-by-skill and generate a week-by-week learning plan.
          </p>
        </div>

        {/* How it works */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 12, marginBottom: 40 }}>
          {[
            { n: "1", title: "Paste JD + Resume", desc: "We extract skills and identify gaps automatically." },
            { n: "2", title: "AI Interview",      desc: "Adaptive questions per skill — easy to hard." },
            { n: "3", title: "Get your roadmap",  desc: "Scored results + week-by-week learning plan." },
          ].map(step => (
            <div key={step.n} style={{
              background: "var(--bg2)", border: "1px solid var(--border)",
              borderRadius: "var(--radius)", padding: "16px",
            }}>
              <div style={{
                width: 26, height: 26, borderRadius: 6, background: "rgba(124,58,237,0.15)",
                color: "var(--purple-l)", fontSize: 12, fontWeight: 700,
                display: "flex", alignItems: "center", justifyContent: "center", marginBottom: 10,
              }}>{step.n}</div>
              <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 4 }}>{step.title}</div>
              <div style={{ fontSize: 12, color: "var(--text2)", lineHeight: 1.5 }}>{step.desc}</div>
            </div>
          ))}
        </div>

        {/* Form */}
        <Card>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 24 }}>
            <h2 style={{ fontSize: 16, fontWeight: 600 }}>Upload your details</h2>
            <button onClick={loadSample} style={{
              fontSize: 12, color: "var(--purple-l)", background: "none",
              border: "1px solid rgba(124,58,237,0.3)", borderRadius: "var(--radius-sm)",
              padding: "4px 10px", cursor: "pointer",
            }}>
              Load sample data ↗
            </button>
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
            <TextArea
              label="Job Description"
              value={jd}
              onChange={setJd}
              placeholder="Paste the full job description here…"
              hint="Tip: Include the required/preferred skills section for best results."
              minRows={9}
            />
            <TextArea
              label="Your Resume"
              value={resume}
              onChange={setResume}
              placeholder="Paste your resume as plain text here…"
              hint="Plain text works best. You can also drag-and-drop a .txt file."
              minRows={9}
            />

            {/* ── Depth selector ─────────────────────────────────────────── */}
            <div>
              <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 10, color: "var(--text1)" }}>
                Assessment Depth
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 10 }}>
                {DEPTH_LEVELS.map(level => {
                  const isSelected = depth === level.id;
                  return (
                    <button
                      key={level.id}
                      id={`depth-${level.id}`}
                      onClick={() => setDepth(level.id)}
                      style={{
                        background: isSelected
                          ? `rgba(${level.id === "snapshot" ? "16,185,129" : level.id === "standard" ? "124,58,237" : "239,68,68"},0.12)`
                          : "var(--bg2)",
                        border: `1.5px solid ${isSelected ? level.color : "var(--border)"}`,
                        borderRadius: "var(--radius)",
                        padding: "14px 12px",
                        cursor: "pointer",
                        textAlign: "left",
                        transition: "all 0.15s ease",
                        color: "inherit",
                      }}
                    >
                      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6 }}>
                        <span style={{ fontSize: 18 }}>{level.icon}</span>
                        <span style={{
                          fontSize: 13, fontWeight: 700,
                          color: isSelected ? level.color : "var(--text1)",
                        }}>
                          {level.label}
                        </span>
                        <span style={{
                          marginLeft: "auto", fontSize: 11,
                          background: isSelected ? level.color : "var(--bg3, rgba(255,255,255,0.07))",
                          color: isSelected ? "#fff" : "var(--text2)",
                          borderRadius: 99, padding: "2px 8px", fontWeight: 600,
                        }}>
                          {level.questions}Q
                        </span>
                      </div>
                      <div style={{ fontSize: 11, color: "var(--text2)", lineHeight: 1.5 }}>
                        {level.desc}
                      </div>
                    </button>
                  );
                })}
              </div>
              {selectedLevel && (
                <div style={{
                  marginTop: 10, fontSize: 12, color: "var(--text2)",
                  display: "flex", alignItems: "center", gap: 6,
                }}>
                  <span style={{ color: selectedLevel.color }}>●</span>
                  <span>
                    <b style={{ color: "var(--text1)" }}>{selectedLevel.label}</b> mode selected —{" "}
                    {selectedLevel.questions} question{selectedLevel.questions > 1 ? "s" : ""} per skill topic
                  </span>
                </div>
              )}
            </div>

            <ErrorBanner message={error} />

            <div style={{ display: "flex", justifyContent: "flex-end" }}>
              <Button onClick={handleSubmit} disabled={loading} style={{ padding: "11px 28px", fontSize: 15 }}>
                {loading ? <><Spinner size={16} /> Analysing…</> : "Start Assessment →"}
              </Button>
            </div>
          </div>
        </Card>
      </div>
    </Shell>
  );
}
