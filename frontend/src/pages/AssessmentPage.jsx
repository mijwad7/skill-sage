import { useState, useEffect, useRef } from "react";
import { useParams, useLocation, useNavigate } from "react-router-dom";
import { api } from "../api/client";
import {
  Shell, Card, Button, ProgressBar,
  DifficultyBadge, SkillChip, TypingIndicator, ErrorBanner, Spinner,
} from "../components/ui";

export default function AssessmentPage() {
  const { sessionId }       = useParams();
  const { state }           = useLocation();
  const navigate            = useNavigate();
  const bottomRef           = useRef(null);
  const inputRef            = useRef(null);

  // Initialise from navigation state (set by UploadPage) or fetch fresh
  const initial = state?.sessionData;

  const [messages,    setMessages]    = useState(() => initial ? [
    { role: "agent", content: initial.first_question, skill: initial.progress?.skill },
  ] : []);
  const [progress,    setProgress]    = useState(initial?.progress   || null);
  const [difficulty,  setDifficulty]  = useState("easy");
  const [gaps,        setGaps]        = useState(initial?.gaps       || []);
  const [answer,      setAnswer]      = useState("");
  const [loading,     setLoading]     = useState(!initial);
  const [typing,      setTyping]      = useState(false);
  const [error,       setError]       = useState("");
  const [submitted,   setSubmitted]   = useState(false);

  // If navigated directly (no state), fetch session
  useEffect(() => {
    if (!initial) {
      api.getSession(sessionId)
        .then(data => {
          setProgress(data.progress);
          setGaps(data.gaps);
          setDifficulty(data.difficulty);
          setLoading(false);
          // No pending message in fresh load — shouldn't happen in normal flow
        })
        .catch(e => { setError(e.message); setLoading(false); });
    }
  }, [sessionId]);

  // Auto-scroll to latest message
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, typing]);

  // Focus input when typing stops
  useEffect(() => {
    if (!typing) inputRef.current?.focus();
  }, [typing]);

  const send = async () => {
    const trimmed = answer.trim();
    if (!trimmed || typing || loading) return;

    const userMsg = { role: "user", content: trimmed };
    setMessages(prev => [...prev, userMsg]);
    setAnswer("");
    setTyping(true);
    setError("");
    setSubmitted(true);

    try {
      const data = await api.sendMessage(sessionId, trimmed);

      setTyping(false);

      if (data.type === "complete") {
        // Show completion message then redirect
        setMessages(prev => [...prev, {
          role: "agent",
          content: "Great — that's the assessment complete! Generating your personalised learning plan…",
          isCompletion: true,
        }]);
        setTimeout(() => navigate(`/session/${sessionId}/results`), 1800);
        return;
      }

      // Show feedback as a subtle aside, then the new question
      const newMsgs = [];
      if (data.feedback) {
        newMsgs.push({ role: "feedback", content: data.feedback });
      }
      newMsgs.push({
        role: "agent",
        content: data.content,
        skill: data.skill,
      });

      setMessages(prev => [...prev, ...newMsgs]);
      setProgress(data.progress);
      setDifficulty(data.difficulty || "easy");
      setSubmitted(false);

    } catch (e) {
      setTyping(false);
      setError(e.message);
      setSubmitted(false);
    }
  };

  const handleKey = (e) => {
    if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) send();
  };

  if (loading) {
    return (
      <Shell>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: 400, gap: 12, color: "var(--text2)" }}>
          <Spinner /> Loading session…
        </div>
      </Shell>
    );
  }

  const currentSkill = progress?.skill || gaps[0];

  return (
    <Shell maxWidth={720}>
      <div className="animate-fade-in">
        {/* Header info */}
        <div style={{ marginBottom: 24 }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
              <span style={{ fontSize: 13, color: "var(--text2)" }}>Assessing:</span>
              {gaps.map(skill => (
                <SkillChip key={skill} name={skill} active={skill === currentSkill} />
              ))}
            </div>
            <DifficultyBadge level={difficulty} />
          </div>
          {progress && (
            <ProgressBar
              pct={progress.pct}
              label={`Skill ${progress.current} of ${progress.total} — ${currentSkill}`}
            />
          )}
        </div>

        {/* Chat window */}
        <Card style={{ padding: 0, overflow: "hidden", marginBottom: 16 }}>
          <div style={{
            minHeight: 380,
            maxHeight: 520,
            overflowY: "auto",
            padding: "20px 24px",
            display: "flex",
            flexDirection: "column",
            gap: 4,
          }}>
            {messages.map((msg, i) => (
              <MessageBubble key={i} msg={msg} index={i} />
            ))}
            {typing && (
              <div style={{ display: "flex", alignItems: "flex-end", gap: 10, marginTop: 8 }}>
                <Avatar />
                <div style={{
                  background: "var(--bg3)", border: "1px solid var(--border)",
                  borderRadius: "0 12px 12px 12px", overflow: "hidden",
                }}>
                  <TypingIndicator />
                </div>
              </div>
            )}
            <div ref={bottomRef} />
          </div>
        </Card>

        <ErrorBanner message={error} />

        {/* Answer input */}
        <Card style={{ padding: 16 }}>
          <textarea
            ref={inputRef}
            value={answer}
            onChange={e => setAnswer(e.target.value)}
            onKeyDown={handleKey}
            placeholder="Type your answer… (Ctrl+Enter to send)"
            disabled={typing || submitted}
            rows={4}
            style={{
              width: "100%",
              background: "var(--bg3)",
              border: "1px solid var(--border)",
              borderRadius: "var(--radius)",
              padding: "12px 14px",
              fontSize: 14,
              color: "var(--text)",
              resize: "none",
              outline: "none",
              lineHeight: 1.6,
              marginBottom: 12,
              opacity: typing ? 0.5 : 1,
            }}
            onFocus={e => (e.target.style.borderColor = "var(--purple)")}
            onBlur={e => (e.target.style.borderColor = "var(--border)")}
          />
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <span style={{ fontSize: 12, color: "var(--text3)" }}>
              Be specific — mention projects, tools, or scenarios where relevant.
            </span>
            <Button onClick={send} disabled={!answer.trim() || typing || submitted}>
              {typing ? <><Spinner size={14} /> Evaluating…</> : "Send →"}
            </Button>
          </div>
        </Card>
      </div>
    </Shell>
  );
}

/* ── Message bubble ─────────────────────────────────────────────────────────── */
function MessageBubble({ msg, index }) {
  const delay = `${Math.min(index * 0.03, 0.2)}s`;

  if (msg.role === "feedback") {
    return (
      <div className="animate-fade-in" style={{ animationDelay: delay }}>
        <div style={{
          fontSize: 12, color: "var(--teal-l)",
          background: "rgba(13,148,136,0.08)",
          border: "1px solid rgba(13,148,136,0.2)",
          borderRadius: "var(--radius-sm)",
          padding: "6px 12px",
          margin: "6px 0",
          fontStyle: "italic",
        }}>
          ✓ {msg.content}
        </div>
      </div>
    );
  }

  if (msg.role === "user") {
    return (
      <div className="animate-slide-in" style={{ animationDelay: delay, display: "flex", justifyContent: "flex-end", marginTop: 10 }}>
        <div style={{
          maxWidth: "78%",
          background: "var(--purple)",
          borderRadius: "12px 12px 0 12px",
          padding: "12px 16px",
          fontSize: 14,
          lineHeight: 1.6,
          color: "#fff",
        }}>
          {msg.content}
        </div>
      </div>
    );
  }

  // Agent message
  return (
    <div className="animate-fade-up" style={{ animationDelay: delay, display: "flex", alignItems: "flex-start", gap: 10, marginTop: 10 }}>
      <Avatar />
      <div style={{ flex: 1 }}>
        {msg.skill && (
          <div style={{ fontSize: 11, color: "var(--text3)", marginBottom: 5, fontFamily: "var(--mono)" }}>
            {msg.skill}
            {msg.isCompletion && " · Complete"}
          </div>
        )}
        <div style={{
          background: "var(--bg3)",
          border: `1px solid ${msg.isCompletion ? "var(--teal)" : "var(--border)"}`,
          borderRadius: "0 12px 12px 12px",
          padding: "12px 16px",
          fontSize: 14,
          lineHeight: 1.65,
          color: "var(--text)",
          maxWidth: "82%",
        }}>
          {msg.content}
        </div>
      </div>
    </div>
  );
}

function Avatar() {
  return (
    <div style={{
      width: 30, height: 30, borderRadius: 8, flexShrink: 0,
      background: "rgba(124,58,237,0.2)", border: "1px solid rgba(124,58,237,0.3)",
      display: "flex", alignItems: "center", justifyContent: "center",
      fontSize: 13, fontWeight: 700, color: "var(--purple-l)",
    }}>S</div>
  );
}
