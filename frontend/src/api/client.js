const BASE = import.meta.env.VITE_API_URL || "";

function formatError(errorData) {
  let errorStr = typeof errorData === "string" ? errorData : String(errorData);
  try { if (typeof errorData === "object") errorStr = JSON.stringify(errorData); } catch (e) {}

  const lowerError = errorStr.toLowerCase();
  
  if (lowerError.includes("503") || lowerError.includes("unavailable") || lowerError.includes("high demand") || lowerError.includes("capacity")) {
    return "Our AI models are currently experiencing high demand. Please wait a few moments and try again.";
  }
  if (lowerError.includes("429") || lowerError.includes("quota") || lowerError.includes("too many requests")) {
    return "We're receiving too many requests right now. Please wait a minute and try again.";
  }
  if (lowerError.includes("timeout") || lowerError.includes("timed out")) {
    return "The request took too long to complete. Please try again.";
  }
  if (lowerError.includes("500") || lowerError.includes("internal server error")) {
    return "An unexpected server error occurred. Please try again later.";
  }
  if (errorStr.includes("{") && errorStr.includes("}")) {
    return "An unexpected error occurred processing your request. Please try again.";
  }
  if (errorStr.length > 120) {
    return "An unexpected error occurred. Please try again later.";
  }
  return errorStr;
}

async function request(path, options = {}) {
  let res;
  try {
    res = await fetch(`${BASE}${path}`, {
      headers: { "Content-Type": "application/json", ...options.headers },
      ...options,
    });
  } catch (e) {
    throw new Error("Unable to connect to the server. Please check your internet connection.");
  }

  let data;
  try {
    data = await res.json();
  } catch (e) {
    if (!res.ok) throw new Error(formatError(`HTTP ${res.status}`));
    throw new Error("Invalid response from server.");
  }

  if (!res.ok) {
    const rawError = data?.error || `HTTP ${res.status}`;
    throw new Error(formatError(rawError));
  }
  
  return data;
}

export const api = {
  /** Upload JD + resume, get back session + first question */
  createSession: (jdText, resumeText, depth = "standard") =>
    request("/api/sessions/", {
      method: "POST",
      body: JSON.stringify({ jd_text: jdText, resume_text: resumeText, depth }),
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

  /** Upload file to extract text */
  extractText: async (file) => {
    const formData = new FormData();
    formData.append("file", file);
    let res;
    try {
      res = await fetch(`${BASE}/api/extract-text/`, {
        method: "POST",
        body: formData,
      });
    } catch (e) {
      throw new Error("Unable to connect to the server. Please check your internet connection.");
    }

    let data;
    try {
      data = await res.json();
    } catch (e) {
      if (!res.ok) throw new Error(formatError(`HTTP ${res.status}`));
      throw new Error("Invalid response from server.");
    }

    if (!res.ok) {
      const rawError = data?.error || `HTTP ${res.status}`;
      throw new Error(formatError(rawError));
    }
    return data;
  },
};
