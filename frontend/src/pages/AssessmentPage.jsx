import { useState, useEffect, useRef } from "react";
import { useParams, useLocation, useNavigate } from "react-router-dom";
import { api } from "../api/client";
import { Spinner } from "../components/ui";

function LoadingSequence({ steps }) {
  const [step, setStep] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setStep(s => Math.min(s + 1, steps.length - 1));
    }, 2500);
    return () => clearInterval(interval);
  }, [steps]);

  return <span className="animate-fade-up" key={step} style={{ marginLeft: 8, fontSize: 13, color: "var(--text2)", fontStyle: "italic" }}>{steps[step]}</span>;
}

export default function AssessmentPage() {
  const { sessionId } = useParams();
  const { state } = useLocation();
  const navigate = useNavigate();
  const bottomRef = useRef(null);
  const inputRef = useRef(null);

  const initial = state?.sessionData;

  const [messages, setMessages] = useState(() => initial ? [
    { role: "agent", content: initial.first_question, skill: initial.progress?.skill },
  ] : []);
  const [progress, setProgress] = useState(initial?.progress || null);
  const [difficulty, setDifficulty] = useState("medium");
  const [gaps, setGaps] = useState(initial?.gaps || []);
  const [answer, setAnswer] = useState("");
  const [loading, setLoading] = useState(!initial);
  const [typing, setTyping] = useState(false);
  const [error, setError] = useState("");
  const [submitted, setSubmitted] = useState(false);
  const [speakingId, setSpeakingId] = useState(null);
  const [isListening, setIsListening] = useState(false);
  const synthRef = useRef(window.speechSynthesis);
  const recognitionRef = useRef(null);
  const originalAnswerRef = useRef("");

  useEffect(() => {
    if (!initial) {
      api.getSession(sessionId)
        .then(data => {
          setProgress(data.progress);
          setGaps(data.gaps);
          setDifficulty(data.difficulty || "medium");
          setLoading(false);
        })
        .catch(e => { setError(e.message); setLoading(false); });
    }
  }, [sessionId, initial]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, typing]);

  useEffect(() => {
    if (!typing) inputRef.current?.focus();
  }, [typing]);

  const send = async () => {
    const trimmed = answer.trim();
    if (!trimmed || typing || loading) return;

    setMessages(prev => [...prev, { role: "user", content: trimmed }]);
    setAnswer("");
    setTyping(true);
    setError("");
    setSubmitted(true);

    try {
      const data = await api.sendMessage(sessionId, trimmed);
      setTyping(false);

      if (data.type === "complete") {
        setMessages(prev => [...prev, { role: "agent", content: "Great — that's the assessment complete! Generating your personalised learning plan…", isCompletion: true }]);
        setTimeout(() => navigate(`/session/${sessionId}/results`), 1800);
        return;
      }

      const newMsgs = [];
      if (data.feedback) {
        // Embed feedback organically before the next question to match UI
        newMsgs.push({ role: "agent", content: data.feedback, insight: data.insight });
      }
      newMsgs.push({ role: "agent", content: data.content, skill: data.skill });

      setMessages(prev => [...prev, ...newMsgs]);
      setProgress(data.progress);
      setDifficulty(data.difficulty || "medium");
      setSubmitted(false);

    } catch (e) {
      setTyping(false);
      setError(e.message);
      setSubmitted(false);
    }
  };

  const toggleSpeech = (text, id) => {
    if (speakingId === id) {
      synthRef.current.cancel();
      setSpeakingId(null);
      return;
    }

    synthRef.current.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    
    // Pick a good female voice if available
    const voices = synthRef.current.getVoices();
    const preferredVoice = voices.find(v => v.name.includes("Google US English") || v.name.includes("Female")) || voices[0];
    if (preferredVoice) utterance.voice = preferredVoice;
    
    utterance.rate = 1.05;
    utterance.onend = () => setSpeakingId(null);
    utterance.onerror = () => setSpeakingId(null);

    setSpeakingId(id);
    synthRef.current.speak(utterance);
  };
 
  const toggleListening = () => {
    if (isListening) {
      recognitionRef.current?.stop();
      setIsListening(false);
      return;
    }
 
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) {
      alert("Speech recognition is not supported in this browser. Try Chrome or Edge.");
      return;
    }
 
    const recognition = new SpeechRecognition();
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.lang = "en-US";
 
    recognition.onstart = () => {
      setIsListening(true);
      originalAnswerRef.current = answer;
    };
    recognition.onresult = (event) => {
      let sessionTranscript = "";
      for (let i = 0; i < event.results.length; i++) {
        sessionTranscript += event.results[i][0].transcript;
      }
      
      const base = originalAnswerRef.current.trim();
      setAnswer(base ? `${base} ${sessionTranscript}` : sessionTranscript);
    };
    recognition.onerror = () => setIsListening(false);
    recognition.onend = () => setIsListening(false);
 
    recognitionRef.current = recognition;
    recognition.start();
  };

  const handleKey = (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      send();
    }
  };

  if (loading) {
    return (
      <div style={{ minHeight: "100vh", background: "#060608", display: "flex", alignItems: "center", justifyContent: "center", color: "var(--text2)" }}>
        <Spinner size={32} />
      </div>
    );
  }

  // Calculate overall difficulty progress for the meter
  const difficultyPct = difficulty === "hard" ? 90 : difficulty === "medium" ? 50 : 20;
  const currentSkill = progress?.skill || gaps[0];

  return (
    <div style={{ minHeight: "100vh", background: "#060608", color: "#fff", fontFamily: "var(--font)", display: "flex", flexDirection: "column" }}>
      {/* Header */}
      <header className="mobile-padding" style={{ padding: "16px 32px", display: "flex", justifyContent: "space-between", alignItems: "center", borderBottom: "1px solid var(--glass-border)" }}>
        <button onClick={() => navigate("/")} style={{ background: "var(--glass-bg)", border: "1px solid var(--glass-border)", color: "var(--text2)", padding: "8px 16px", borderRadius: 8, cursor: "pointer", fontSize: 14 }}>
          ✕ Exit
        </button>
        <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end" }}>
          <div style={{ fontSize: 14, color: "var(--text2)" }}>Skill Assessment</div>
          <div className="mobile-only" style={{ fontSize: 12, color: "var(--purple-l)", fontWeight: 600 }}>{currentSkill}</div>
        </div>
      </header>

      <div className="mobile-stack mobile-padding mobile-chat-main-container" style={{ display: "flex", flex: 1, overflow: "hidden", padding: 24, gap: 24, maxWidth: 1400, margin: "0 auto", width: "100%" }}>
        
        {/* Left Sidebar */}
        <div className="mobile-hide" style={{ width: 320, display: "flex", flexDirection: "column", gap: 24, flexShrink: 0 }}>
          <div className="glass-card" style={{ padding: 24, borderRadius: 16, flex: 1 }}>
            <div style={{ fontSize: 12, color: "var(--text2)", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: 24 }}>Progress & Skills</div>
            <div style={{ display: "flex", flexDirection: "column", gap: 20, position: "relative" }}>
              {/* Vertical line connecting nodes */}
              <div style={{ position: "absolute", left: 11, top: 10, bottom: 10, width: 2, background: "var(--glass-border)" }} />
              
              {gaps.map((skill, i) => {
                const isActive = skill === currentSkill;
                const isPast = progress && gaps.indexOf(skill) < gaps.indexOf(progress.skill);
                const showQuestions = isActive && progress ? ` - Q${progress.current}/${progress.total}` : "";

                return (
                  <div key={skill} style={{ display: "flex", alignItems: "center", gap: 16, zIndex: 1 }}>
                    <div style={{ 
                      width: 24, height: 24, borderRadius: "50%", 
                      background: isActive ? "var(--purple)" : isPast ? "var(--purple-l)" : "var(--bg3)",
                      border: `4px solid ${isActive ? "rgba(168,85,247,0.3)" : "transparent"}`,
                      boxShadow: isActive ? "0 0 15px rgba(168,85,247,0.5)" : "none",
                      transition: "all 0.3s"
                    }} />
                    <div style={{ fontSize: 14, fontWeight: isActive ? 600 : 500, color: isActive ? "#fff" : "var(--text2)" }}>
                      {skill} <span style={{ color: "var(--text3)", fontSize: 12 }}>{showQuestions}</span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Right Main Area */}
        <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: 24 }}>
          
          {/* Difficulty Meter */}
          <div className="glass-card" style={{ padding: "16px 24px", borderRadius: 16 }}>
            <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12, color: "var(--text2)", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: 12 }}>
              <span>Difficulty Meter</span>
              <span style={{ color: "#fff" }}>Adaptive Level: <span style={{ textTransform: "capitalize" }}>{difficulty}</span></span>
            </div>
            <div style={{ height: 6, background: "var(--bg3)", borderRadius: 99, position: "relative" }}>
               <div style={{ height: "100%", width: `${difficultyPct}%`, background: "linear-gradient(90deg, var(--purple), var(--cyan))", borderRadius: 99, boxShadow: "0 0 10px var(--purple)", transition: "width 0.5s var(--ease)" }} />
               <div style={{ position: "absolute", top: -4, left: `calc(${difficultyPct}% - 7px)`, width: 14, height: 14, borderRadius: "50%", background: "var(--cyan)", border: "2px solid #fff", boxShadow: "0 0 10px var(--cyan)", transition: "left 0.5s var(--ease)" }} />
            </div>
          </div>

          {/* Chat Area */}
          <div className="glass-card" style={{ flex: 1, borderRadius: 16, display: "flex", flexDirection: "column", overflow: "hidden", position: "relative" }}>
            
            {/* Messages */}
            <div style={{ flex: 1, overflowY: "auto", padding: 24, display: "flex", flexDirection: "column", gap: 24 }}>
              {messages.map((msg, i) => {
                const isAgent = msg.role === "agent";
                return (
                  <div key={i} className="animate-fade-up" style={{ display: "flex", flexDirection: isAgent ? "row" : "row-reverse", alignItems: "flex-start", gap: 16 }}>
                    {isAgent && (
                      <div style={{ width: 32, height: 32, borderRadius: 8, background: "rgba(168,85,247,0.2)", border: "1px solid rgba(168,85,247,0.4)", display: "flex", alignItems: "center", justifyContent: "center", color: "var(--purple-l)", fontSize: 12, fontWeight: 700, flexShrink: 0 }}>AI</div>
                    )}
                    <div className="mobile-chat-bubble-container" style={{ position: "relative", maxWidth: "80%" }}>
                      <div className="mobile-chat-bubble" style={{
                        background: isAgent ? "var(--glass-bg)" : "transparent",
                        border: isAgent ? "1px solid var(--glass-border)" : "1px solid var(--purple)",
                        boxShadow: isAgent ? "none" : "0 0 15px rgba(168,85,247,0.15)",
                        padding: "16px 20px",
                        borderRadius: isAgent ? "0 16px 16px 16px" : "16px 0 16px 16px",
                        fontSize: 15,
                        lineHeight: 1.6,
                        color: "#fff"
                      }}>
                        {msg.content}
                      </div>
                      
                      {msg.insight && (
                        <div style={{
                          marginTop: 8,
                          padding: "10px 14px",
                          borderRadius: 8,
                          background: "rgba(255,255,255,0.03)",
                          borderLeft: "2px solid var(--purple-l)",
                          fontSize: 13,
                          color: "var(--text2)",
                          fontStyle: "italic",
                          display: "flex",
                          gap: 8,
                          alignItems: "flex-start"
                        }}>
                          <span style={{ color: "var(--purple-l)", fontWeight: 600, fontStyle: "normal", flexShrink: 0 }}>Agent Insight:</span>
                          <span style={{ lineHeight: 1.4 }}>{msg.insight}</span>
                        </div>
                      )}

                      {isAgent && (
                        <button 
                          onClick={() => toggleSpeech(msg.content, i)}
                          style={{
                            position: "absolute",
                            right: -36,
                            top: 0,
                            background: "none",
                            border: "none",
                            color: speakingId === i ? "var(--purple-l)" : "var(--text3)",
                            cursor: "pointer",
                            padding: 8,
                            transition: "color 0.2s",
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center"
                          }}
                          onMouseOver={e => e.currentTarget.style.color = "var(--purple-l)"}
                          onMouseOut={e => e.currentTarget.style.color = speakingId === i ? "var(--purple-l)" : "var(--text3)"}
                          title={speakingId === i ? "Stop speaking" : "Listen to message"}
                        >
                          {speakingId === i ? (
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><rect x="6" y="6" width="12" height="12" rx="2" /></svg>
                          ) : (
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                              <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"></polygon>
                              <path d="M19.07 4.93a10 10 0 0 1 0 14.14M15.54 8.46a5 5 0 0 1 0 7.07"></path>
                            </svg>
                          )}
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
              
              {typing && (
                <div className="animate-fade-up" style={{ display: "flex", alignItems: "flex-start", gap: 16 }}>
                  <div style={{ width: 32, height: 32, borderRadius: 8, background: "rgba(168,85,247,0.2)", border: "1px solid rgba(168,85,247,0.4)", display: "flex", alignItems: "center", justifyContent: "center", color: "var(--purple-l)", fontSize: 12, fontWeight: 700 }}>AI</div>
                  <div style={{ padding: "12px 16px", background: "var(--glass-bg)", border: "1px solid var(--glass-border)", borderRadius: "0 16px 16px 16px", display: "flex", alignItems: "center", gap: 6 }}>
                    <div style={{ width: 6, height: 6, borderRadius: "50%", background: "var(--purple-l)", animation: "pulse 1.2s infinite" }} />
                    <div style={{ width: 6, height: 6, borderRadius: "50%", background: "var(--cyan)", animation: "pulse 1.2s 0.2s infinite" }} />
                    <div style={{ width: 6, height: 6, borderRadius: "50%", background: "var(--pink)", animation: "pulse 1.2s 0.4s infinite" }} />
                    <LoadingSequence steps={
                      progress?.current === progress?.total ? [
                        "Evaluating final response...",
                        "Synthesizing skill data...",
                        "Building personalized roadmap..."
                      ] : [
                        "Analyzing response...",
                        "Adapting interview logic...",
                        "Generating next question..."
                      ]
                    } />
                  </div>
                </div>
              )}
              <div ref={bottomRef} />
            </div>

            {/* Input Area */}
            <div className="mobile-chat-input-area" style={{ padding: 24, background: "rgba(6,6,8,0.6)", borderTop: "1px solid var(--glass-border)" }}>
              {error && <div style={{ color: "var(--red-l)", fontSize: 13, marginBottom: 12 }}>{error}</div>}
              <div style={{ display: "flex", gap: 12, background: "var(--bg3)", border: "1px solid rgba(168,85,247,0.4)", borderRadius: 12, padding: "8px", boxShadow: isListening ? "0 0 20px rgba(168,85,247,0.4)" : "0 0 20px rgba(168,85,247,0.1)", transition: "all 0.2s" }} onFocus={e => e.currentTarget.style.borderColor = "var(--purple)"} onBlur={e => e.currentTarget.style.borderColor = "rgba(168,85,247,0.4)"}>
                <button
                  onClick={toggleListening}
                  style={{
                    background: isListening ? "var(--purple)" : "rgba(255,255,255,0.05)",
                    border: "none",
                    borderRadius: 8,
                    width: 44,
                    height: 44,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    cursor: "pointer",
                    color: isListening ? "#fff" : "var(--text3)",
                    transition: "all 0.2s",
                    flexShrink: 0
                  }}
                  title={isListening ? "Stop listening" : "Dictate your answer"}
                >
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z"></path>
                    <path d="M19 10v2a7 7 0 0 1-14 0v-2"></path>
                    <line x1="12" y1="19" x2="12" y2="23"></line>
                    <line x1="8" y1="23" x2="16" y2="23"></line>
                  </svg>
                </button>
                <textarea
                  ref={inputRef}
                  value={answer}
                  onChange={e => setAnswer(e.target.value)}
                  onKeyDown={handleKey}
                  placeholder="Type your response here..."
                  disabled={typing || submitted}
                  rows={2}
                  style={{ flex: 1, background: "transparent", border: "none", color: "#fff", fontSize: 15, outline: "none", resize: "none", padding: "8px 12px", fontFamily: "var(--font)", lineHeight: 1.5 }}
                />
                <button
                  className="mobile-chat-send"
                  onClick={send}
                  disabled={!answer.trim() || typing || submitted}
                  style={{ background: "linear-gradient(135deg, var(--purple), var(--cyan))", border: "none", borderRadius: 8, padding: "0 24px", color: "#fff", fontWeight: 600, cursor: (!answer.trim() || typing || submitted) ? "not-allowed" : "pointer", opacity: (!answer.trim() || typing || submitted) ? 0.5 : 1, display: "flex", alignItems: "center", gap: 8 }}
                >
                  <span className="mobile-chat-send-text">Send</span> <span>↗</span>
                </button>
              </div>
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}
