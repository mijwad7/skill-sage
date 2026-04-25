import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { api } from "../api/client";
import { Shell, Card, Button, ProgressBar, ScoreRing, ErrorBanner, Spinner } from "../components/ui";
import {
  RadarChart, PolarGrid, PolarAngleAxis, Radar,
  ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, Cell,
} from "recharts";

export default function ResultsPage() {
  const { sessionId } = useParams();
  const navigate      = useNavigate();
  const [data,    setData]    = useState(null);
  const [loading, setLoading] = useState(true);
  const [error,   setError]   = useState("");
  const [openPlan, setOpenPlan] = useState(null);

  useEffect(() => {
    api.getResults(sessionId)
      .then(setData)
      .catch(e => setError(e.message))
      .finally(() => setLoading(false));
  }, [sessionId]);

  if (loading) {
    return (
      <Shell>
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", height: 400, gap: 16 }}>
          <Spinner size={32} />
          <p style={{ color: "var(--text2)", fontSize: 14 }}>Generating your personalised learning plan…</p>
        </div>
      </Shell>
    );
  }

  if (error) {
    return (
      <Shell>
        <ErrorBanner message={error} />
        <Button onClick={() => navigate("/")} style={{ marginTop: 16 }}>← Start over</Button>
      </Shell>
    );
  }

  const { scored_skills = [], learning_plan = [], summary = {} } = data || {};
  const radarData = scored_skills.map(s => ({ subject: s.skill, score: s.score, fullMark: 100 }));
  const bandColors = { Expert: "#7c3aed", Proficient: "#0d9488", Developing: "#d97706", Beginner: "#dc2626" };

  return (
    <Shell maxWidth={820}>
      <div className="animate-fade-up">

        {/* Page header */}
        <div style={{ marginBottom: 36 }}>
          <div style={{ fontSize: 12, color: "var(--text3)", fontFamily: "var(--mono)", marginBottom: 8 }}>
            Assessment complete
          </div>
          <h1 style={{ fontSize: 30, fontWeight: 600, letterSpacing: "-0.02em", marginBottom: 8 }}>
            Your results
          </h1>
          <p style={{ fontSize: 14, color: "var(--text2)" }}>
            Based on your resume and assessment performance across {summary.total_skills} skills.
          </p>
        </div>

        {/* Summary cards */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 12, marginBottom: 28 }}>
          {[
            { label: "Average score", value: `${summary.avg_score}/100` },
            { label: "Strongest skill", value: summary.strongest || "—" },
            { label: "Biggest gap",    value: summary.weakest   || "—" },
          ].map(({ label, value }) => (
            <div key={label} style={{
              background: "var(--bg2)", border: "1px solid var(--border)",
              borderRadius: "var(--radius)", padding: "16px 20px",
            }}>
              <div style={{ fontSize: 11, color: "var(--text3)", textTransform: "uppercase", letterSpacing: ".07em", marginBottom: 6 }}>{label}</div>
              <div style={{ fontSize: 22, fontWeight: 600, color: "var(--text)" }}>{value}</div>
            </div>
          ))}
        </div>

        {/* Charts row */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, marginBottom: 28 }}>
          {/* Radar */}
          <Card style={{ padding: "20px" }}>
            <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 16, color: "var(--text2)" }}>Skill radar</div>
            <ResponsiveContainer width="100%" height={220}>
              <RadarChart data={radarData}>
                <PolarGrid stroke="var(--border)" />
                <PolarAngleAxis dataKey="subject" tick={{ fill: "var(--text2)", fontSize: 11 }} />
                <Radar name="Score" dataKey="score" stroke="#7c3aed" fill="#7c3aed" fillOpacity={0.2} strokeWidth={2} />
              </RadarChart>
            </ResponsiveContainer>
          </Card>

          {/* Bar chart */}
          <Card style={{ padding: "20px" }}>
            <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 16, color: "var(--text2)" }}>Score breakdown</div>
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={scored_skills} layout="vertical" margin={{ left: 0, right: 16 }}>
                <XAxis type="number" domain={[0, 100]} tick={{ fill: "var(--text3)", fontSize: 11 }} axisLine={false} tickLine={false} />
                <YAxis type="category" dataKey="skill" tick={{ fill: "var(--text2)", fontSize: 11 }} axisLine={false} tickLine={false} width={90} />
                <Tooltip
                  contentStyle={{ background: "var(--bg2)", border: "1px solid var(--border)", borderRadius: 8, fontSize: 12 }}
                  formatter={(v) => [`${v}/100`, "Score"]}
                />
                <Bar dataKey="score" radius={[0, 4, 4, 0]} maxBarSize={18}>
                  {scored_skills.map((s, i) => (
                    <Cell key={i} fill={bandColors[s.band] || "#7c3aed"} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </Card>
        </div>

        {/* Skill score cards */}
        <h2 style={{ fontSize: 16, fontWeight: 600, marginBottom: 14 }}>Skill scores</h2>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))", gap: 12, marginBottom: 36 }}>
          {scored_skills.map((s, i) => (
            <Card key={s.skill} style={{ padding: "16px 20px", animationDelay: `${i * 0.05}s` }} className="animate-fade-up">
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 12 }}>
                <div>
                  <div style={{ fontSize: 14, fontWeight: 600, marginBottom: 4 }}>{s.skill}</div>
                  <span style={{
                    fontSize: 11, padding: "2px 8px", borderRadius: 99, fontWeight: 500,
                    background: `${bandColors[s.band]}22`,
                    color: bandColors[s.band],
                  }}>{s.band}</span>
                </div>
                <ScoreRing score={s.score} size={56} />
              </div>
              <ProgressBar pct={s.score} color={bandColors[s.band]} />
              {/* Q&A history preview */}
              {s.history?.length > 0 && (
                <div style={{ marginTop: 10, fontSize: 11, color: "var(--text3)" }}>
                  {s.history.length} question{s.history.length > 1 ? "s" : ""} · avg {Math.round(s.history.reduce((a, h) => a + h.score, 0) / s.history.length * 10)}/100
                </div>
              )}
            </Card>
          ))}
        </div>

        {/* Learning plan */}
        {learning_plan.length > 0 && (
          <>
            <h2 style={{ fontSize: 16, fontWeight: 600, marginBottom: 6 }}>Learning roadmap</h2>
            <p style={{ fontSize: 13, color: "var(--text2)", marginBottom: 16 }}>
              Ranked by priority. Each plan is tailored to your current level.
            </p>
            <div style={{ display: "flex", flexDirection: "column", gap: 12, marginBottom: 40 }}>
              {learning_plan.map((plan, i) => (
                <PlanCard
                  key={plan.skill}
                  plan={plan}
                  index={i}
                  open={openPlan === plan.skill}
                  onToggle={() => setOpenPlan(openPlan === plan.skill ? null : plan.skill)}
                />
              ))}
            </div>
          </>
        )}

        {/* Footer actions */}
        <div style={{ display: "flex", gap: 12, justifyContent: "center", paddingTop: 8 }}>
          <Button variant="ghost" onClick={() => navigate("/")}>← Start new assessment</Button>
          <Button onClick={() => window.print()}>Download results ↓</Button>
        </div>

      </div>
    </Shell>
  );
}

/* ── Learning plan card (accordion) ─────────────────────────────────────────── */
function PlanCard({ plan, index, open, onToggle }) {
  const priorityColor = { high: "#dc2626", medium: "#d97706", low: "#059669" };
  const pColor = priorityColor[plan.priority] || "#7c3aed";

  return (
    <Card
      style={{ padding: 0, overflow: "hidden", animationDelay: `${index * 0.06}s` }}
      className="animate-fade-up"
    >
      {/* Header (always visible) */}
      <button
        onClick={onToggle}
        style={{
          width: "100%", background: "none", border: "none", cursor: "pointer",
          padding: "18px 24px", display: "flex", alignItems: "center",
          justifyContent: "space-between", textAlign: "left",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
          <div style={{ textAlign: "center", minWidth: 44 }}>
            <div style={{ fontSize: 22, fontWeight: 700, color: "var(--text)", lineHeight: 1 }}>{plan.current_score}</div>
            <div style={{ fontSize: 10, color: "var(--text3)" }}>/ 100</div>
          </div>
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
              <span style={{ fontSize: 15, fontWeight: 600, color: "var(--text)" }}>{plan.skill}</span>
              <span style={{
                fontSize: 10, padding: "1px 7px", borderRadius: 99, fontWeight: 600,
                background: `${pColor}22`, color: pColor,
                textTransform: "uppercase", letterSpacing: ".05em",
              }}>{plan.priority}</span>
            </div>
            <div style={{ fontSize: 12, color: "var(--text2)" }}>
              {plan.current_band} · {plan.weeks_needed} week{plan.weeks_needed > 1 ? "s" : ""} to proficiency
            </div>
          </div>
        </div>
        <div style={{ color: "var(--text3)", fontSize: 18, transition: "transform 0.2s", transform: open ? "rotate(90deg)" : "rotate(0)" }}>
          ›
        </div>
      </button>

      {/* Expanded body */}
      {open && (
        <div className="animate-fade-in" style={{ borderTop: "1px solid var(--border)", padding: "20px 24px" }}>

          {/* Weekly goals */}
          <div style={{ marginBottom: 20 }}>
            <div style={{ fontSize: 12, fontWeight: 600, color: "var(--text2)", marginBottom: 10, textTransform: "uppercase", letterSpacing: ".06em" }}>
              Weekly goals
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {(plan.weekly_goals || []).map((goal, i) => (
                <div key={i} style={{ display: "flex", gap: 10, alignItems: "flex-start" }}>
                  <div style={{
                    width: 20, height: 20, borderRadius: 4, flexShrink: 0, marginTop: 1,
                    background: "rgba(124,58,237,0.12)", border: "1px solid rgba(124,58,237,0.25)",
                    display: "flex", alignItems: "center", justifyContent: "center",
                    fontSize: 10, color: "var(--purple-l)", fontWeight: 600,
                  }}>{i + 1}</div>
                  <div style={{ fontSize: 13, color: "var(--text)", lineHeight: 1.5 }}>{goal}</div>
                </div>
              ))}
            </div>
          </div>

          {/* Mini project */}
          {plan.mini_project && (
            <div style={{ marginBottom: 20 }}>
              <div style={{ fontSize: 12, fontWeight: 600, color: "var(--text2)", marginBottom: 8, textTransform: "uppercase", letterSpacing: ".06em" }}>
                Capstone project
              </div>
              <div style={{
                background: "rgba(124,58,237,0.07)",
                border: "1px solid rgba(124,58,237,0.2)",
                borderRadius: "var(--radius)",
                padding: "12px 16px",
                fontSize: 13,
                color: "var(--text)",
                lineHeight: 1.55,
              }}>
                🛠 {plan.mini_project}
              </div>
            </div>
          )}

          {/* Resources */}
          {plan.resources?.length > 0 && (
            <div>
              <div style={{ fontSize: 12, fontWeight: 600, color: "var(--text2)", marginBottom: 10, textTransform: "uppercase", letterSpacing: ".06em" }}>
                Resources
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                {plan.resources.map((r, i) => (
                  <a
                    key={i}
                    href={r.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    style={{
                      display: "flex", alignItems: "center", gap: 10,
                      background: "var(--bg3)", border: "1px solid var(--border)",
                      borderRadius: "var(--radius-sm)", padding: "10px 14px",
                      color: "var(--text)", textDecoration: "none",
                      transition: "border-color 0.15s",
                    }}
                    onMouseEnter={e => (e.currentTarget.style.borderColor = "var(--border2)")}
                    onMouseLeave={e => (e.currentTarget.style.borderColor = "var(--border)")}
                  >
                    <span style={{ fontSize: 14 }}>{typeIcon(r.type)}</span>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: 13, fontWeight: 500 }}>{r.title}</div>
                      <div style={{ fontSize: 11, color: "var(--text3)", fontFamily: "var(--mono)" }}>
                        {r.url.replace(/^https?:\/\//, "").split("/")[0]}
                      </div>
                    </div>
                    <span style={{ fontSize: 11, color: "var(--text3)" }}>↗</span>
                  </a>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </Card>
  );
}

function typeIcon(type) {
  return { video: "▶", docs: "📄", course: "🎓", book: "📚" }[type] || "🔗";
}
