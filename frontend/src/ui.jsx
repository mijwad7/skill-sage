import { useState, useRef } from "react";

/* ── Layout shell ─────────────────────────────────────────────────────────── */
export function Shell({ children, maxWidth = 760 }) {
  return (
    <div style={{ minHeight: "100vh", display: "flex", flexDirection: "column" }}>
      <header style={{
        borderBottom: "1px solid var(--border)",
        padding: "0 24px",
        height: 52,
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        position: "sticky",
        top: 0,
        background: "rgba(9,9,11,0.85)",
        backdropFilter: "blur(12px)",
        zIndex: 10,
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <div style={{
            width: 26, height: 26, borderRadius: 6,
            background: "var(--purple)", display: "flex",
            alignItems: "center", justifyContent: "center",
            fontSize: 13, fontWeight: 700, color: "#fff",
          }}>S</div>
          <span style={{ fontSize: 14, fontWeight: 600, color: "var(--text)" }}>
            SkillAgent
          </span>
        </div>
        <span style={{ fontSize: 12, color: "var(--text3)", fontFamily: "var(--mono)" }}>
          AI-Powered Assessment
        </span>
      </header>
      <main style={{
        flex: 1,
        maxWidth,
        width: "100%",
        margin: "0 auto",
        padding: "40px 24px",
      }}>
        {children}
      </main>
    </div>
  );
}

/* ── Button ───────────────────────────────────────────────────────────────── */
export function Button({ children, onClick, disabled, variant = "primary", style = {}, type = "button" }) {
  const styles = {
    primary: {
      background: "var(--purple)",
      color: "#fff",
      border: "none",
    },
    ghost: {
      background: "transparent",
      color: "var(--text2)",
      border: "1px solid var(--border)",
    },
    danger: {
      background: "transparent",
      color: "var(--red-l)",
      border: "1px solid var(--red)",
    },
  };
  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled}
      style={{
        padding: "9px 20px",
        borderRadius: "var(--radius-sm)",
        fontSize: 14,
        fontWeight: 500,
        cursor: disabled ? "not-allowed" : "pointer",
        opacity: disabled ? 0.5 : 1,
        transition: "opacity 0.15s, transform 0.1s",
        display: "inline-flex",
        alignItems: "center",
        gap: 6,
        ...styles[variant],
        ...style,
      }}
      onMouseDown={e => !disabled && (e.currentTarget.style.transform = "scale(0.97)")}
      onMouseUp={e => (e.currentTarget.style.transform = "scale(1)")}
    >
      {children}
    </button>
  );
}

/* ── Card ─────────────────────────────────────────────────────────────────── */
export function Card({ children, style = {}, className = "" }) {
  return (
    <div
      className={className}
      style={{
        background: "var(--bg2)",
        border: "1px solid var(--border)",
        borderRadius: "var(--radius-lg)",
        padding: "24px",
        ...style,
      }}
    >
      {children}
    </div>
  );
}

/* ── Textarea with file-drop ──────────────────────────────────────────────── */
export function TextArea({ label, value, onChange, placeholder, hint, minRows = 8 }) {
  const [dragging, setDragging] = useState(false);
  const inputRef = useRef();

  const handleDrop = (e) => {
    e.preventDefault();
    setDragging(false);
    const file = e.dataTransfer.files[0];
    if (file) readFile(file);
  };

  const readFile = (file) => {
    const reader = new FileReader();
    reader.onload = (e) => onChange(e.target.result);
    reader.readAsText(file);
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
        <label style={{ fontSize: 13, fontWeight: 500, color: "var(--text2)" }}>{label}</label>
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          style={{
            fontSize: 12, color: "var(--purple-l)", background: "none",
            border: "none", cursor: "pointer", padding: 0,
          }}
        >
          Upload file ↑
        </button>
        <input ref={inputRef} type="file" accept=".txt,.md" hidden onChange={e => e.target.files[0] && readFile(e.target.files[0])} />
      </div>
      <textarea
        value={value}
        onChange={e => onChange(e.target.value)}
        placeholder={placeholder}
        rows={minRows}
        onDragOver={e => { e.preventDefault(); setDragging(true); }}
        onDragLeave={() => setDragging(false)}
        onDrop={handleDrop}
        style={{
          background: dragging ? "rgba(124,58,237,0.07)" : "var(--bg3)",
          border: `1px solid ${dragging ? "var(--purple)" : "var(--border)"}`,
          borderRadius: "var(--radius)",
          padding: "14px 16px",
          fontSize: 13,
          color: "var(--text)",
          resize: "vertical",
          outline: "none",
          transition: "border-color 0.2s",
          lineHeight: 1.6,
          width: "100%",
        }}
        onFocus={e => (e.target.style.borderColor = "var(--purple)")}
        onBlur={e => (e.target.style.borderColor = "var(--border)")}
      />
      {hint && <p style={{ fontSize: 12, color: "var(--text3)" }}>{hint}</p>}
    </div>
  );
}

/* ── Progress bar ─────────────────────────────────────────────────────────── */
export function ProgressBar({ pct, color = "var(--purple)", label }) {
  return (
    <div>
      {label && (
        <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12, color: "var(--text2)", marginBottom: 6 }}>
          <span>{label}</span>
          <span>{pct}%</span>
        </div>
      )}
      <div style={{ height: 4, background: "var(--bg3)", borderRadius: 99, overflow: "hidden" }}>
        <div style={{
          height: "100%",
          width: `${pct}%`,
          background: color,
          borderRadius: 99,
          transition: "width 0.5s var(--ease)",
        }} />
      </div>
    </div>
  );
}

/* ── Difficulty badge ─────────────────────────────────────────────────────── */
export function DifficultyBadge({ level }) {
  const config = {
    easy:   { color: "var(--green-l)",  bg: "rgba(5,150,105,0.12)",  dots: 1, label: "Easy"   },
    medium: { color: "var(--amber-l)",  bg: "rgba(217,119,6,0.12)",  dots: 2, label: "Medium" },
    hard:   { color: "var(--red-l)",    bg: "rgba(220,38,38,0.12)",  dots: 3, label: "Hard"   },
  };
  const c = config[level] || config.easy;
  return (
    <span style={{
      display: "inline-flex", alignItems: "center", gap: 5,
      background: c.bg, color: c.color,
      fontSize: 12, fontWeight: 500,
      padding: "3px 10px", borderRadius: 99,
    }}>
      {"●".repeat(c.dots)}{"○".repeat(3 - c.dots)} {c.label}
    </span>
  );
}

/* ── Score ring ───────────────────────────────────────────────────────────── */
export function ScoreRing({ score, size = 72 }) {
  const color = score >= 85 ? "#7c3aed" : score >= 65 ? "#0d9488" : score >= 40 ? "#d97706" : "#dc2626";
  const r = (size / 2) - 6;
  const circ = 2 * Math.PI * r;
  const dash = (score / 100) * circ;
  return (
    <svg width={size} height={size} style={{ transform: "rotate(-90deg)" }}>
      <circle cx={size/2} cy={size/2} r={r} fill="none" stroke="var(--bg3)" strokeWidth={5} />
      <circle
        cx={size/2} cy={size/2} r={r} fill="none"
        stroke={color} strokeWidth={5}
        strokeDasharray={`${dash} ${circ}`}
        strokeLinecap="round"
        style={{ transition: "stroke-dasharray 0.8s var(--ease)" }}
      />
      <text
        x={size/2} y={size/2}
        textAnchor="middle" dominantBaseline="central"
        style={{ transform: "rotate(90deg)", transformOrigin: `${size/2}px ${size/2}px` }}
        fill={color} fontSize={size > 60 ? 18 : 14} fontWeight={600}
        fontFamily="var(--font)"
      >
        {score}
      </text>
    </svg>
  );
}

/* ── Skill chip ───────────────────────────────────────────────────────────── */
export function SkillChip({ name, active = false }) {
  return (
    <span style={{
      display: "inline-block",
      padding: "3px 10px",
      borderRadius: 99,
      fontSize: 12,
      fontWeight: 500,
      background: active ? "rgba(124,58,237,0.18)" : "var(--bg3)",
      color: active ? "var(--purple-l)" : "var(--text2)",
      border: `1px solid ${active ? "var(--purple)" : "var(--border)"}`,
      transition: "all 0.2s",
    }}>
      {name}
    </span>
  );
}

/* ── Typing indicator ─────────────────────────────────────────────────────── */
export function TypingIndicator() {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 4, padding: "12px 16px" }}>
      {[0, 0.15, 0.3].map((delay, i) => (
        <div key={i} style={{
          width: 7, height: 7, borderRadius: "50%",
          background: "var(--text3)",
          animation: `pulse 1.2s ${delay}s ease-in-out infinite`,
        }} />
      ))}
    </div>
  );
}

/* ── Error banner ─────────────────────────────────────────────────────────── */
export function ErrorBanner({ message }) {
  if (!message) return null;
  return (
    <div style={{
      background: "rgba(220,38,38,0.1)",
      border: "1px solid var(--red)",
      borderRadius: "var(--radius)",
      padding: "12px 16px",
      fontSize: 13,
      color: "var(--red-l)",
    }}>
      {message}
    </div>
  );
}

/* ── Spinner ──────────────────────────────────────────────────────────────── */
export function Spinner({ size = 20 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none"
      style={{ animation: "spin 0.8s linear infinite" }}>
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      <circle cx="12" cy="12" r="10" stroke="var(--border2)" strokeWidth="3" />
      <path d="M12 2a10 10 0 0 1 10 10" stroke="var(--purple-l)" strokeWidth="3" strokeLinecap="round" />
    </svg>
  );
}
