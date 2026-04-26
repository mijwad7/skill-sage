import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { api } from "../api/client";
import { Spinner } from "../components/ui";

export default function ResultsPage() {
  const { sessionId } = useParams();
  const navigate = useNavigate();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    api.getResults(sessionId)
      .then(setData)
      .catch(e => setError(e.message))
      .finally(() => setLoading(false));
  }, [sessionId]);

  if (loading) {
    return (
      <div style={{ minHeight: "100vh", background: "#060608", display: "flex", alignItems: "center", justifyContent: "center", color: "var(--text2)" }}>
        <Spinner size={32} />
        <span style={{ marginLeft: 16 }}>Generating your personalised learning plan…</span>
      </div>
    );
  }

  if (error) {
    return (
      <div style={{ minHeight: "100vh", background: "#060608", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", color: "var(--red-l)" }}>
        <div style={{ padding: 24, background: "rgba(220,38,38,0.1)", border: "1px solid var(--red)", borderRadius: 12 }}>{error}</div>
        <button onClick={() => navigate("/")} style={{ marginTop: 24, padding: "10px 20px", background: "var(--glass-bg)", border: "1px solid var(--glass-border)", color: "#fff", borderRadius: 8, cursor: "pointer" }}>← Start over</button>
      </div>
    );
  }

  const { scored_skills = [], learning_plan = [], summary = {}, verification_insights = [], hire_recommendation } = data || {};

  // For older sessions that didn't generate hire_recommendation
  const rec = hire_recommendation || {
    status: (summary.avg_score || 0) > 75 ? "Strong Hire" : (summary.avg_score || 0) > 50 ? "Hire with targeted upskilling" : "Borderline",
    reasoning: "Based on overall assessment performance across core role requirements."
  };

  const getStatusColor = (status) => {
    if (status.includes("Strong")) return "var(--cyan)";
    if (status.includes("Upskilling") || status.includes("targeted")) return "var(--purple-l)";
    if (status.includes("Borderline")) return "var(--amber-l)";
    return "var(--red-l)";
  };

  // Find strongest and weakest skills based on actual scores
  const sortedSkills = [...scored_skills].sort((a, b) => b.score - a.score);
  const topStrength = sortedSkills[0] || { skill: "N/A", band: "N/A" };
  const biggestGap = sortedSkills[sortedSkills.length - 1] || { skill: "N/A", band: "N/A" };

  return (
    <div style={{ minHeight: "100vh", background: "#060608", color: "#fff", fontFamily: "var(--font)", paddingBottom: 80, position: "relative", overflowX: "hidden" }}>
      {/* Background Glows */}
      <div style={{ position: "absolute", top: -100, left: -200, width: 800, height: 800, background: "radial-gradient(circle, var(--purple) 0%, transparent 50%)", opacity: 0.1, pointerEvents: "none" }} />
      <div style={{ position: "absolute", bottom: -200, right: -200, width: 800, height: 800, background: "radial-gradient(circle, var(--cyan) 0%, transparent 50%)", opacity: 0.1, pointerEvents: "none" }} />

      {/* Header */}
      <header className="mobile-padding" style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "16px 40px", borderBottom: "1px solid var(--glass-border)", background: "rgba(6,6,8,0.8)", backdropFilter: "blur(12px)", position: "sticky", top: 0, zIndex: 10 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <div style={{ width: 28, height: 28, borderRadius: 8, background: "linear-gradient(135deg, var(--purple), var(--pink))", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: "bold", fontSize: 12 }}>S</div>
          <span style={{ fontSize: 18, fontWeight: 700, letterSpacing: "-0.02em" }}>SkillSage</span>
        </div>
        <div style={{ display: "flex", gap: 16 }}>
          <button onClick={() => window.print()} style={{ background: "linear-gradient(90deg, #9333ea, #d946ef)", border: "none", borderRadius: 6, padding: "8px 16px", color: "#fff", fontSize: 13, fontWeight: 600, cursor: "pointer", display: "flex", alignItems: "center", gap: 6, boxShadow: "0 0 15px rgba(168,85,247,0.4)" }}>
            <span className="mobile-hide" style={{ fontSize: 16 }}>↓</span> Print
          </button>
        </div>
      </header>

      <main style={{ maxWidth: 1200, margin: "0 auto", padding: "40px 24px", position: "relative", zIndex: 1 }}>
        {/* Recommendation Header */}
        <div className="glass-card animate-fade-up" style={{ padding: "32px", borderRadius: 20, marginBottom: 40, borderLeft: `6px solid ${getStatusColor(rec.status)}`, background: "linear-gradient(90deg, rgba(255,255,255,0.05) 0%, transparent 100%)" }}>
           <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: 24 }}>
             <div>
               <div style={{ fontSize: 14, color: "var(--text2)", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: 8 }}>Overall Role Readiness: <span style={{ color: "#fff", fontWeight: 700, fontSize: 16 }}>{summary.avg_score || 0}%</span></div>
               <h1 style={{ fontSize: 32, fontWeight: 700, margin: "0 0 16px 0", color: getStatusColor(rec.status) }}>Recommendation: {rec.status}</h1>
               <p style={{ fontSize: 16, color: "var(--text)", lineHeight: 1.6, maxWidth: 800, margin: 0 }}>{rec.reasoning}</p>
             </div>
           </div>
        </div>

        {/* Top Summary Row */}
        <div className="mobile-stack animate-fade-up" style={{ display: "flex", justifyContent: "center", alignItems: "center", gap: 40, marginBottom: 60 }}>
          {/* Top Strength */}
          <div className="glass-card mobile-full" style={{ flex: 1, maxWidth: 340, padding: 24, borderRadius: 16, display: "flex", alignItems: "center", gap: 16 }}>
            <div style={{ width: 48, height: 48, borderRadius: 12, background: "rgba(34,211,238,0.1)", border: "1px solid rgba(34,211,238,0.2)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 24 }}>⚛️</div>
            <div>
              <div style={{ fontSize: 12, color: "var(--text2)", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: 4 }}>Top Strength</div>
              <div style={{ fontSize: 16, fontWeight: 600 }}>{topStrength.skill} ({topStrength.band})</div>
            </div>
          </div>
 
          {/* Average Score Ring */}
          <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", width: 180, height: 180, borderRadius: "50%", background: "var(--glass-bg)", border: "4px solid rgba(168,85,247,0.3)", position: "relative", boxShadow: "0 0 40px rgba(168,85,247,0.2)", flexShrink: 0 }}>
             {/* Simulated ring progress */}
             <div style={{ position: "absolute", top: -4, left: -4, right: -4, bottom: -4, borderRadius: "50%", border: "4px solid transparent", borderTopColor: "var(--pink)", borderRightColor: "var(--purple)", transform: `rotate(${Math.min(summary.avg_score || 0, 100) * 3.6 - 90}deg)`, transition: "transform 1s var(--ease)" }} />
             <div style={{ fontSize: 12, color: "var(--text2)", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: 4 }}>Avg Score</div>
             <div style={{ fontSize: 42, fontWeight: 800, lineHeight: 1 }}>{summary.avg_score || 0}<span style={{ fontSize: 24, color: "var(--text3)" }}>%</span></div>
          </div>
 
          {/* Biggest Gap */}
          <div className="glass-card mobile-full" style={{ flex: 1, maxWidth: 340, padding: 24, borderRadius: 16, display: "flex", alignItems: "center", gap: 16 }}>
            <div style={{ width: 48, height: 48, borderRadius: 12, background: "rgba(244,114,182,0.1)", border: "1px solid rgba(244,114,182,0.2)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 24 }}>📉</div>
            <div>
              <div style={{ fontSize: 12, color: "var(--text2)", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: 4 }}>Biggest Gap</div>
              <div style={{ fontSize: 16, fontWeight: 600 }}>{biggestGap.skill} ({biggestGap.band})</div>
            </div>
          </div>
        </div>

        {/* Skill Proficiency Breakdown */}
        <h2 style={{ fontSize: 20, fontWeight: 600, marginBottom: 20 }}>Skill Proficiency Breakdown</h2>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))", gap: 16, marginBottom: 60 }}>
          {scored_skills.map((skill, i) => {
            const colors = { Expert: "var(--purple-l)", Proficient: "var(--cyan)", Developing: "var(--amber-l)", Beginner: "var(--red-l)" };
            const color = colors[skill.band] || "var(--purple)";
            return (
              <div key={skill.skill} className="glass-card animate-fade-up" style={{ animationDelay: `${i * 0.05}s`, padding: "20px 24px", borderRadius: 16 }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: 12 }}>
                  <div style={{ fontSize: 16, fontWeight: 600 }}>{skill.skill}</div>
                  <div style={{ fontSize: 12, color: "var(--text2)" }}>Score: {skill.score}%</div>
                </div>
                <div style={{ height: 4, background: "rgba(255,255,255,0.1)", borderRadius: 99, marginBottom: 16, overflow: "hidden" }}>
                  <div style={{ height: "100%", width: `${skill.score}%`, background: color, borderRadius: 99, boxShadow: `0 0 10px ${color}` }} />
                </div>
                <div>
                  <div style={{ fontSize: 11, color: "var(--text3)", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: 4 }}>Skill Band</div>
                  <div style={{ fontSize: 13, color, fontWeight: 500, display: "inline-flex", alignItems: "center", gap: 6, padding: "2px 10px", background: `${color}15`, border: `1px solid ${color}30`, borderRadius: 99 }}>
                    {skill.band}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
 
        {/* Verification Insights */}
        {verification_insights && verification_insights.length > 0 && (
          <div style={{ marginBottom: 60 }}>
            <h2 style={{ fontSize: 20, fontWeight: 600, marginBottom: 20 }}>Verification Insights</h2>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))", gap: 16 }}>
              {verification_insights.map((insight, i) => (
                <div key={i} className="glass-card animate-fade-up" style={{ 
                  animationDelay: `${i * 0.1}s`, 
                  padding: "24px", 
                  borderRadius: 16,
                  border: `1px solid ${insight.color}40`,
                  background: `${insight.color}08`,
                  position: "relative",
                  overflow: "hidden"
                }}>
                  {/* Subtle Background Icon */}
                  <div style={{ position: "absolute", right: -10, bottom: -10, fontSize: 80, opacity: 0.05, pointerEvents: "none" }}>{insight.icon}</div>
                  
                  <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 12 }}>
                    <div style={{ width: 24, height: 24, borderRadius: "50%", background: insight.color, color: "#fff", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 12 }}>{insight.icon}</div>
                    <span style={{ fontSize: 14, fontWeight: 600, color: insight.color }}>{insight.label}</span>
                  </div>
                  <div style={{ fontSize: 16, fontWeight: 700, marginBottom: 8, color: "#fff" }}>{insight.skill}</div>
                  <p style={{ fontSize: 14, color: "var(--text2)", lineHeight: 1.5, margin: 0 }}>{insight.message}</p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* 8-Week Roadmap */}
        {learning_plan.length > 0 && (
          <div>
            <h2 style={{ fontSize: 20, fontWeight: 600, marginBottom: 20 }}>Personalized Learning Roadmap</h2>
            <div className="responsive-grid" style={{ gridTemplateColumns: "repeat(auto-fill, minmax(320px, 1fr))", gap: 20 }}>
              {learning_plan.map((plan, i) => (
                <div key={plan.skill} className="glass-card animate-fade-up" style={{ animationDelay: `${i * 0.1}s`, padding: 24, borderRadius: 16, borderLeft: `4px solid var(--purple)`, position: "relative" }}>
                  <div style={{ fontSize: 12, color: "var(--text3)", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: 8 }}>
                    Week {i + 1} • {plan.skill}
                  </div>
                  <h3 style={{ fontSize: 18, fontWeight: 600, marginBottom: 12, lineHeight: 1.4 }}>Focus: {plan.current_band} to Proficiency</h3>
                  
                  {plan.role_relevance && (
                    <div style={{ marginBottom: 16, padding: "8px 12px", background: "rgba(168,85,247,0.1)", borderRadius: 8, borderLeft: "2px solid var(--purple-l)" }}>
                      <div style={{ fontSize: 11, fontWeight: 600, color: "var(--purple-l)", marginBottom: 4, textTransform: "uppercase", letterSpacing: "0.05em" }}>Why this matters for this role</div>
                      <div style={{ fontSize: 13, color: "var(--text)", lineHeight: 1.5 }}>{plan.role_relevance}</div>
                    </div>
                  )}

                  {plan.weekly_goals && plan.weekly_goals.length > 0 && (
                    <div style={{ marginBottom: 16 }}>
                       <div style={{ fontSize: 12, fontWeight: 600, color: "var(--text2)", marginBottom: 6 }}>Key Goal</div>
                       <div style={{ fontSize: 13, color: "var(--text)", lineHeight: 1.5 }}>{plan.weekly_goals[0]}</div>
                    </div>
                  )}

                  <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                    {plan.resources && plan.resources.map((r, j) => (
                      <a key={j} href={r.url} target="_blank" rel="noreferrer" style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 12, color: "var(--text2)", textDecoration: "none", transition: "color 0.2s" }} onMouseOver={e => e.currentTarget.style.color = "#fff"} onMouseOut={e => e.currentTarget.style.color = "var(--text2)"}>
                        <span style={{ color: "var(--purple-l)" }}>▶</span> {r.title}
                      </a>
                    ))}
                    {plan.mini_project && (
                      <div style={{ display: "flex", alignItems: "flex-start", gap: 8, fontSize: 12, color: "var(--text2)", marginTop: 4 }}>
                        <span style={{ color: "var(--cyan)" }}>★</span>
                        <span style={{ lineHeight: 1.5 }}>Project: {plan.mini_project}</span>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
