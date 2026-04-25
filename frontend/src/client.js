const BASE = import.meta.env.VITE_API_URL || "";

async function request(path, options = {}) {
  const res = await fetch(`${BASE}${path}`, {
    headers: { "Content-Type": "application/json", ...options.headers },
    ...options,
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || `HTTP ${res.status}`);
  return data;
}

export const api = {
  /** Upload JD + resume, get back session + first question */
  createSession: (jdText, resumeText) =>
    request("/api/sessions/", {
      method: "POST",
      body: JSON.stringify({ jd_text: jdText, resume_text: resumeText }),
    }),

  /** Get current session state */
  getSession: (sessionId) =>
    request(`/api/sessions/${sessionId}/`),

  /** Send candidate answer, receive next question or completion */
  sendMessage: (sessionId, answer) =>
    request(`/api/sessions/${sessionId}/message/`, {
      method: "POST",
      body: JSON.stringify({ answer }),
    }),

  /** Get final results once status === 'complete' */
  getResults: (sessionId) =>
    request(`/api/sessions/${sessionId}/results/`),
};
