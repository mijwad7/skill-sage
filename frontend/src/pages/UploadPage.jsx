import { useState, useRef, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { api } from "../api/client";
import { Button, TextArea, ErrorBanner, Spinner } from "../components/ui";
import heroNetwork from "../assets/hero_network.png";

const UPLOAD_LOADING_STEPS = [
  "Parsing resume claims...",
  "Mapping role requirements...",
  "Designing adaptive interview..."
];

function LoadingSequence({ steps }) {
  const [step, setStep] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setStep(s => Math.min(s + 1, steps.length - 1));
    }, 2500); // switch every 2.5s
    return () => clearInterval(interval);
  }, [steps]);

  return <span className="animate-fade-up" key={step}>{steps[step]}</span>;
}


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
    color: "var(--cyan)",
  },
  {
    id: "standard",
    label: "Standard",
    questions: 3,
    icon: "🎯",
    desc: "3 adaptive questions per skill. The recommended balanced assessment.",
    color: "var(--purple-l)",
  },
  {
    id: "deep",
    label: "Deep Dive",
    questions: 5,
    icon: "🔬",
    desc: "5 questions per skill — easy to hard. Thorough evaluation.",
    color: "var(--pink)",
  },
];

export default function UploadPage() {
  const navigate   = useNavigate();
  const [jd, setJd]           = useState("");
  const [resume, setResume]   = useState("");
  const [depth, setDepth]     = useState("standard");
  const [loading, setLoading] = useState(false);
  const [error, setError]     = useState("");
  const formRef = useRef(null);

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

  const scrollToForm = () => {
    formRef.current?.scrollIntoView({ block: "start" });
  };

  const selectedLevel = DEPTH_LEVELS.find(d => d.id === depth);

  return (
    <div style={{ minHeight: "100vh", background: "#060608", color: "#fff", position: "relative" }}>
      {/* Background glow effects */}
      <div style={{ position: "absolute", top: -200, right: -200, width: 600, height: 600, background: "radial-gradient(circle, var(--cyan-g) 0%, transparent 60%)", opacity: 0.15, pointerEvents: "none" }} />
      <div style={{ position: "absolute", top: 100, left: -200, width: 600, height: 600, background: "radial-gradient(circle, var(--pink-g) 0%, transparent 60%)", opacity: 0.15, pointerEvents: "none" }} />

      {/* Header */}
      <header className="mobile-padding" style={{ 
        display: "flex", 
        justifyContent: "space-between", 
        alignItems: "center", 
        padding: "16px 60px", 
        position: "sticky", 
        top: 0, 
        zIndex: 100,
        background: "rgba(6, 6, 8, 0.7)",
        backdropFilter: "blur(12px)",
        borderBottom: "1px solid var(--glass-border)"
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <div style={{ width: 32, height: 32, borderRadius: 8, background: "linear-gradient(135deg, var(--purple), var(--pink))", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: "bold" }}>S</div>
          <span style={{ fontSize: 20, fontWeight: 700, letterSpacing: "-0.03em" }}>SkillSage</span>
        </div>
        <a 
          href="#assessment-form"
          style={{ 
            background: "linear-gradient(90deg, #9333ea, #c084fc)", 
            border: "none", 
            padding: "8px 20px", 
            borderRadius: 8, 
            color: "#fff", 
            fontWeight: 600, 
            cursor: "pointer", 
            boxShadow: "0 0 20px rgba(168,85,247,0.3)",
            fontSize: 14,
            transition: "transform 0.2s",
            textDecoration: "none"
          }}
          onMouseOver={e => e.target.style.transform = "translateY(-1px)"}
          onMouseOut={e => e.target.style.transform = "translateY(0)"}
        >
          Get Started →
        </a>
      </header>

      <main style={{ maxWidth: 1100, margin: "0 auto", padding: "60px 24px", position: "relative", zIndex: 1 }}>
        {/* Hero Section */}
        <div className="mobile-stack animate-fade-up" style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 100, gap: 40 }}>
          <div className="mobile-center" style={{ maxWidth: 540 }}>
            <h1 className="mobile-full" style={{ fontSize: "clamp(32px, 8vw, 58px)", fontWeight: 800, lineHeight: 1.1, letterSpacing: "-0.03em", marginBottom: 24 }}>
              <span className="text-gradient-pink">Master</span> Your <br/>
              Career Path with <br/>
              <span className="text-gradient">AI Precision.</span>
            </h1>
            <p style={{ fontSize: "clamp(16px, 4vw, 18px)", color: "var(--text2)", lineHeight: 1.6, marginBottom: 40 }}>
              Find Your Skill Gaps. Get a Personalised Roadmap.<br/>
              Practice with adaptive questions per skill, ranging from easy to hard.
            </p>
            <a 
              href="#assessment-form"
              style={{ background: "linear-gradient(90deg, #9333ea, #a855f7)", border: "none", padding: "14px 32px", borderRadius: 8, color: "#fff", fontSize: 16, fontWeight: 600, cursor: "pointer", boxShadow: "0 0 30px rgba(168,85,247,0.5)", transition: "transform 0.2s", textDecoration: "none", display: "inline-block" }}
              onMouseOver={e => e.target.style.transform = "translateY(-2px)"}
              onMouseOut={e => e.target.style.transform = "translateY(0)"}
            >
              Get Your Assessment
            </a>
          </div>
          <div className="mobile-full" style={{ flex: 1, position: "relative", minHeight: 300, display: "flex", justifyContent: "center", alignItems: "center" }}>
            {/* AI Network visualization image */}
            <div style={{ position: "relative", width: "min(450px, 90vw)", height: "min(450px, 90vw)" }}>
              <div style={{ position: "absolute", inset: 0, borderRadius: "50%", background: "radial-gradient(circle, var(--purple) 0%, transparent 70%)", opacity: 0.2, filter: "blur(60px)", animation: "pulse 4s infinite" }} />
              <img 
                src={heroNetwork} 
                alt="AI Network Visualization" 
                style={{ 
                  width: "100%", 
                  height: "100%", 
                  objectFit: "contain", 
                  position: "relative", 
                  zIndex: 2,
                  filter: "drop-shadow(0 0 30px rgba(168,85,247,0.3))",
                  animation: "fadeUp 1.2s var(--ease)"
                }} 
              />
            </div>
          </div>
        </div>

        {/* Features Row */}
        <div className="responsive-grid" style={{ gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))", marginBottom: 120 }}>
          {[
            { icon: "🔍", title: "Identify Gaps", desc: "Pinpoint missing skills with precision using our AI analysis.", color: "var(--cyan)" },
            { icon: "📈", title: "Personalized Roadmap", desc: "Receive a week-by-week learning plan tailored to your career goals.", color: "var(--purple-l)" },
            { icon: "🎙️", title: "Smart Interview", desc: "Practice with adaptive questions per skill, ranging from easy to hard.", color: "var(--pink)" }
          ].map((f, i) => (
            <div key={i} className="glass-card animate-fade-up" style={{ padding: 32, borderRadius: 16, border: `1px solid ${f.color}40`, boxShadow: `0 0 20px ${f.color}15`, transition: "transform 0.2s" }} onMouseOver={e => e.currentTarget.style.transform = "translateY(-4px)"} onMouseOut={e => e.currentTarget.style.transform = "translateY(0)"}>
              <div style={{ fontSize: 32, marginBottom: 16 }}>{f.icon}</div>
              <h3 style={{ fontSize: 18, fontWeight: 600, marginBottom: 12 }}>{f.title}</h3>
              <p style={{ color: "var(--text2)", fontSize: 14, lineHeight: 1.6 }}>{f.desc}</p>
            </div>
          ))}
        </div>

        {/* Assessment Form Area */}
        <div id="assessment-form" ref={formRef} style={{ scrollMarginTop: 100, marginBottom: 100 }}>
          <div style={{ textAlign: "center", marginBottom: 40 }}>
            <h2 style={{ fontSize: 36, fontWeight: 700, letterSpacing: "-0.02em" }}>Start Your Journey</h2>
            <p style={{ color: "var(--text2)", marginTop: 8 }}>Upload your job description and resume to get started.</p>
          </div>

          <div className="glass-card mobile-padding" style={{ padding: 40, borderRadius: 24, position: "relative", overflow: "hidden" }}>
            <div style={{ position: "absolute", top: 0, left: 0, width: "100%", height: 4, background: "linear-gradient(90deg, var(--cyan), var(--purple), var(--pink))" }} />
            
            <div className="mobile-stack" style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 32 }}>
              <h3 style={{ fontSize: 20, fontWeight: 600 }}>Assessment Details</h3>
              <button onClick={loadSample} style={{ fontSize: 13, color: "var(--cyan)", background: "rgba(34,211,238,0.1)", border: "1px solid rgba(34,211,238,0.2)", borderRadius: 6, padding: "6px 14px", cursor: "pointer", transition: "all 0.2s" }} onMouseOver={e => e.target.style.background = "rgba(34,211,238,0.2)"} onMouseOut={e => e.target.style.background = "rgba(34,211,238,0.1)"}>
                Load sample data ↗
              </button>
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: 32 }}>
              <div className="responsive-grid" style={{ gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))" }}>
                <TextArea
                  label="Job Description"
                  value={jd}
                  onChange={setJd}
                  placeholder="Paste the job description or drag-and-drop a PDF/image file…"
                  hint="Supported formats: plain text, PDF, DOCX, PNG, JPG."
                  minRows={10}
                />
                <TextArea
                  label="Your Resume"
                  value={resume}
                  onChange={setResume}
                  placeholder="Paste your resume or drag-and-drop your file here…"
                  hint="Supported formats: plain text, PDF, DOCX, PNG, JPG."
                  minRows={10}
                />
              </div>

              {/* Depth selector */}
              <div>
                <div style={{ fontSize: 14, fontWeight: 600, marginBottom: 12, color: "#fff" }}>
                  Assessment Depth
                </div>
                <div className="responsive-grid" style={{ gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))", gap: 16 }}>
                  {DEPTH_LEVELS.map(level => {
                    const isSelected = depth === level.id;
                    return (
                      <button
                        key={level.id}
                        onClick={() => setDepth(level.id)}
                        style={{
                          background: isSelected ? `${level.color}15` : "var(--glass-bg)",
                          border: `1px solid ${isSelected ? level.color : "var(--glass-border)"}`,
                          borderRadius: 12,
                          padding: "16px",
                          cursor: "pointer",
                          textAlign: "left",
                          transition: "all 0.2s ease",
                          boxShadow: isSelected ? `0 0 20px ${level.color}20` : "none",
                          width: "100%"
                        }}
                      >
                        <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 8 }}>
                          <span style={{ fontSize: 20 }}>{level.icon}</span>
                          <span style={{ fontSize: 15, fontWeight: 700, color: isSelected ? level.color : "#fff" }}>
                            {level.label}
                          </span>
                          <span style={{ marginLeft: "auto", fontSize: 11, background: isSelected ? level.color : "var(--bg3)", color: isSelected ? "#000" : "var(--text2)", borderRadius: 99, padding: "2px 8px", fontWeight: 700 }}>
                            {level.questions}Q
                          </span>
                        </div>
                        <div style={{ fontSize: 12, color: "var(--text2)", lineHeight: 1.5 }}>
                          {level.desc}
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>

              <ErrorBanner message={error} />

              <div style={{ display: "flex", justifyContent: "flex-end", marginTop: 8 }}>
                <button 
                  onClick={handleSubmit} 
                  disabled={loading} 
                  style={{ background: "linear-gradient(90deg, #9333ea, #a855f7)", border: "none", padding: "14px 36px", borderRadius: 8, color: "#fff", fontSize: 15, fontWeight: 600, cursor: loading ? "not-allowed" : "pointer", opacity: loading ? 0.7 : 1, display: "flex", alignItems: "center", gap: 8, boxShadow: "0 0 20px rgba(168,85,247,0.4)" }}
                >
                  {loading ? <><Spinner size={18} /> <LoadingSequence steps={UPLOAD_LOADING_STEPS} /></> : "Start Assessment →"}
                </button>
              </div>
            </div>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="mobile-stack mobile-padding" style={{ borderTop: "1px solid var(--border)", padding: "40px 60px", marginTop: 60, display: "flex", justifyContent: "space-between", alignItems: "center", color: "var(--text3)", fontSize: 13 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <div style={{ width: 20, height: 20, borderRadius: 4, background: "linear-gradient(135deg, var(--purple), var(--pink))", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: "bold", fontSize: 10, color: "#fff" }}>S</div>
          <span style={{ fontWeight: 600, color: "var(--text2)" }}>SkillSage</span>
        </div>
        <div className="mobile-center">© 2026 SkillSage. All rights reserved.</div>
      </footer>
    </div>
  );
}
