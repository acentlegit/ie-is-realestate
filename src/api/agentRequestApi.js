/**
 * Agent Request API – create, list, accept, reject, close.
 * Uses unified engine base URL when VITE_USE_UNIFIED_ENGINE=true.
 */
const UNIFIED_ENGINE_URL = import.meta.env.VITE_UNIFIED_ENGINE_URL || null;
const USE_UNIFIED_ENGINE = import.meta.env.VITE_USE_UNIFIED_ENGINE === "true";
const isProduction = import.meta.env.MODE === "production" || import.meta.env.PROD;
const API_BASE = import.meta.env.VITE_API_BASE || (isProduction ? "" : "http://localhost:8000");

const AGENT_REQUEST_BASE = USE_UNIFIED_ENGINE ? UNIFIED_ENGINE_URL : API_BASE;

function agentRequestUrl(path = "") {
  const base = (AGENT_REQUEST_BASE || "").replace(/\/$/, "");
  return `${base}/v1/agent-requests${path}`;
}

/**
 * Create an agent request when user selects an agent (appears on agent dashboard in real time).
 * @param {{ agentId: string, userId?: string, intentId?: string, userDetails: object, userEmail?: string }} payload
 */
export async function createAgentRequest(payload) {
  const res = await fetch(agentRequestUrl(), {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      agentId: payload.agentId,
      userId: payload.userId,
      actorId: payload.userId,
      intentId: payload.intentId,
      userDetails: payload.userDetails || {},
      userEmail: payload.userEmail || "",
    }),
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Create agent request failed: ${text}`);
  }
  return res.json();
}

/**
 * List requests for an agent (real-time dashboard). Optional status filter.
 * @param {string} agentId
 * @param {string} [status] - PENDING | IN_PROGRESS | REJECTED | CLOSED
 */
export async function listAgentRequests(agentId, status) {
  const params = new URLSearchParams({ agentId: agentId });
  if (status) params.set("status", status);
  const res = await fetch(agentRequestUrl(`?${params}`), {
    method: "GET",
    headers: { "Content-Type": "application/json" },
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`List agent requests failed: ${text}`);
  }
  const data = await res.json();
  return data.requests || [];
}

/**
 * Agent accepts the request. Status → IN_PROGRESS; prevents multiple agents accepting same request.
 */
export async function acceptAgentRequest(requestId, agentId) {
  const res = await fetch(agentRequestUrl(`/${requestId}/accept`), {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ agentId }),
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Accept request failed: ${text}`);
  }
  return res.json();
}

/**
 * Agent rejects with mandatory reason (visible to admin and optionally user).
 */
export async function rejectAgentRequest(requestId, agentId, reason) {
  const res = await fetch(agentRequestUrl(`/${requestId}/reject`), {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ agentId, reason: reason || "" }),
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Reject request failed: ${text}`);
  }
  return res.json();
}

/**
 * Agent closes the request after completion with summary/resolution note.
 */
export async function closeAgentRequest(requestId, agentId, resolutionNote) {
  const res = await fetch(agentRequestUrl(`/${requestId}/close`), {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ agentId, resolutionNote: resolutionNote || "Completed" }),
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Close request failed: ${text}`);
  }
  return res.json();
}
