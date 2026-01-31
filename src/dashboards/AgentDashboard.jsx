import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import keycloak, { logout } from "../auth/keycloakAuth";
import {
  listAgentRequests,
  acceptAgentRequest,
  rejectAgentRequest,
  closeAgentRequest,
} from "../api/agentRequestApi";
import { sendAgentAcceptedEmail } from "../services/emailService";
import "../styles/living-space.css";

const POLL_INTERVAL_MS = 3000;

/** Agent sessions – same layout as buyer (Sessions left, main center, journey/details right) */
const AGENT_SESSIONS = [
  { key: "new", label: "New requests", icon: "📥", subtitle: "Accept or reject" },
  { key: "in_progress", label: "In progress", icon: "🔄", subtitle: "Active requests" },
  { key: "closed", label: "Closed", icon: "✅", subtitle: "Rejected / completed" },
];

function LogoutButton() {
  const navigate = useNavigate();
  const handleLogout = () => {
    logout();
    navigate("/", { replace: true });
  };
  return (
    <button type="button" className="btn" onClick={handleLogout} title="Sign out">
      Logout
    </button>
  );
}

/**
 * Agent Dashboard – same layout as buyer:
 * Topbar (title, sub, Refresh, Status, Logout) + 3-column grid (Sessions | Request list | Request details).
 */
export default function AgentDashboard() {
  const agentId = keycloak.tokenParsed?.sub || keycloak.tokenParsed?.preferred_username || "agent";

  const [activeSession, setActiveSession] = useState("new");
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [actionLoading, setActionLoading] = useState(null);
  const [selectedRequest, setSelectedRequest] = useState(null); // Right panel: full details

  const [rejectModal, setRejectModal] = useState(null);
  const [rejectReason, setRejectReason] = useState("");
  const [closeModal, setCloseModal] = useState(null);
  const [closeNote, setCloseNote] = useState("");

  const fetchRequests = useCallback(async () => {
    try {
      const list = await listAgentRequests(agentId);
      setRequests(list);
      setError(null);
    } catch (e) {
      setError(e.message || "Failed to load requests");
      setRequests([]);
    } finally {
      setLoading(false);
    }
  }, [agentId]);

  useEffect(() => {
    fetchRequests();
    const interval = setInterval(fetchRequests, POLL_INTERVAL_MS);
    return () => clearInterval(interval);
  }, [fetchRequests]);

  const handleAccept = async (req) => {
    setActionLoading(req.id);
    setError(null);
    try {
      await acceptAgentRequest(req.id, agentId);
      const userEmail = req.userEmail;
      if (userEmail) {
        sendAgentAcceptedEmail({
          userEmail,
          requestId: req.id,
          intentId: req.intentId,
          agentName: keycloak.tokenParsed?.name || keycloak.tokenParsed?.preferred_username || "Agent",
        }).catch((emailErr) => console.warn("[Email] Agent accepted notification failed:", emailErr));
      }
      await fetchRequests();
      setSelectedRequest(null);
    } catch (e) {
      setError(e.message || "Accept failed");
    } finally {
      setActionLoading(null);
    }
  };

  const handleRejectOpen = (req) => {
    setRejectModal(req);
    setRejectReason("");
    setError(null);
  };
  const handleRejectSubmit = async () => {
    const reason = (rejectReason || "").trim();
    if (!reason) {
      setError("Rejection reason is required");
      return;
    }
    setActionLoading(rejectModal.id);
    setError(null);
    try {
      await rejectAgentRequest(rejectModal.id, agentId, reason);
      setRejectModal(null);
      setRejectReason("");
      setSelectedRequest(null);
      await fetchRequests();
    } catch (e) {
      setError(e.message || "Reject failed");
    } finally {
      setActionLoading(null);
    }
  };

  const handleCloseOpen = (req) => {
    setCloseModal(req);
    setCloseNote("");
    setError(null);
  };
  const handleCloseSubmit = async () => {
    setActionLoading(closeModal.id);
    setError(null);
    try {
      await closeAgentRequest(closeModal.id, agentId, closeNote || "Completed");
      setCloseModal(null);
      setCloseNote("");
      setSelectedRequest(null);
      await fetchRequests();
    } catch (e) {
      setError(e.message || "Close failed");
    } finally {
      setActionLoading(null);
    }
  };

  const pending = requests.filter((r) => r.status === "PENDING");
  const inProgress = requests.filter((r) => r.status === "IN_PROGRESS");
  const rejectedOrClosed = requests.filter((r) => r.status === "REJECTED" || r.status === "CLOSED");

  const reqCardStyle = {
    padding: 16,
    backgroundColor: "var(--neutral-soft, #f9fafb)",
    borderRadius: 6,
    border: "1px solid var(--stroke)",
    marginBottom: 12,
    cursor: "pointer",
  };
  const btn = (primary, disabled = false) => ({
    padding: "8px 16px",
    border: "none",
    borderRadius: 6,
    cursor: disabled ? "not-allowed" : "pointer",
    fontWeight: 600,
    fontSize: 13,
    opacity: disabled ? 0.7 : 1,
    ...(primary
      ? { backgroundColor: "var(--cool)", color: "#fff" }
      : { backgroundColor: "var(--neutral-soft)", color: "var(--text)" }),
  });
  const badge = (status) => {
    const colors = {
      PENDING: { bg: "var(--warn-soft)", color: "var(--warn)" },
      IN_PROGRESS: { bg: "var(--cool-soft)", color: "var(--cool)" },
      REJECTED: { bg: "var(--bad-soft)", color: "var(--bad)" },
      CLOSED: { bg: "var(--good-soft)", color: "var(--good)" },
    };
    const c = colors[status] || colors.PENDING;
    return { padding: "4px 8px", borderRadius: 4, fontSize: 11, fontWeight: 600, backgroundColor: c.bg, color: c.color };
  };

  return (
    <div className="container">
      {/* Same topbar as buyer */}
      <div className="topbar">
        <div>
          <div className="h1">Intent AI Platform — Real Estate</div>
          <div className="sub">Living Space UI · Agent · Request management</div>
        </div>
        <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
          <button className="btn" onClick={() => window.location.reload()}>Refresh</button>
          <span className="pill">Status: <b>{loading && requests.length === 0 ? "Loading…" : "Ready"}</b></span>
          <span className="pill" style={{ background: "var(--cool-soft)", color: "var(--cool)" }}>agent</span>
          <LogoutButton />
        </div>
      </div>

      {error && (
        <div style={{ marginTop: 14, marginBottom: 0, padding: 12, borderRadius: 8, backgroundColor: "var(--bad-soft)", color: "var(--bad)", fontSize: 14 }}>
          {error}
        </div>
      )}

      {/* Same 3-column grid as buyer: Sessions | Main content | Right panel (Request details) */}
      <div className="grid" style={{ height: "calc(100vh - 140px)", maxHeight: "900px" }}>
        {/* LEFT: Sessions – same structure and styling as buyer */}
        <div className="card" style={{ overflowY: "auto", overflowX: "hidden", padding: 12 }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 10 }}>
            <div className="title" style={{ fontSize: 14 }}>Sessions</div>
            <span className="pill" style={{ fontSize: 10, background: "var(--cool-soft)", color: "var(--cool)" }}>agent</span>
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            {AGENT_SESSIONS.map((session) => (
              <div
                key={session.key}
                onClick={() => setActiveSession(session.key)}
                style={{
                  cursor: "pointer",
                  padding: 8,
                  borderRadius: 8,
                  background: activeSession === session.key ? "var(--cool-soft)" : "var(--neutral-soft)",
                  border: activeSession === session.key ? "1px solid var(--cool)" : "1px solid var(--stroke)",
                  fontSize: 12,
                }}
              >
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                  <span>{session.icon} {session.label}</span>
                  {activeSession === session.key && <span className="pill" style={{ fontSize: 9 }}>Active</span>}
                </div>
                <div className="small" style={{ fontSize: 10, opacity: 0.8, marginTop: 2 }}>
                  {session.subtitle}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* MIDDLE: Request list for selected session */}
        <div className="card" style={{ overflowY: "auto", minWidth: 0, padding: 14 }}>
          {loading && requests.length === 0 ? (
            <div style={{ color: "var(--text)" }}>Loading requests…</div>
          ) : activeSession === "new" ? (
            <>
              <h2 style={{ margin: "0 0 16px", fontSize: 18, fontWeight: 600, color: "var(--text)" }}>
                New requests ({pending.length})
              </h2>
              {pending.length === 0 ? (
                <p className="small" style={{ opacity: 0.8 }}>No new requests. They appear here when a user selects you as their agent.</p>
              ) : (
                pending.map((req) => (
                  <div
                    key={req.id}
                    style={{
                      ...reqCardStyle,
                      borderColor: selectedRequest?.id === req.id ? "var(--cool)" : undefined,
                      background: selectedRequest?.id === req.id ? "var(--cool-soft)" : undefined,
                    }}
                    onClick={() => setSelectedRequest(selectedRequest?.id === req.id ? null : req)}
                  >
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: 8 }}>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontWeight: 600, color: "var(--text)", marginBottom: 4 }}>
                          {req.userDetails?.whatUserWants || req.intentId}
                        </div>
                        <div className="small" style={{ opacity: 0.9 }}>{req.userDetails?.problemDescription || "—"}</div>
                        <div className="small" style={{ marginTop: 8, opacity: 0.7 }}>
                          Requested: {req.createdAt ? new Date(req.createdAt).toLocaleString() : "—"}
                        </div>
                        <span style={badge(req.status)}>{req.status}</span>
                      </div>
                      <div style={{ display: "flex", gap: 8 }} onClick={(e) => e.stopPropagation()}>
                        <button className="btn primary" style={{ fontSize: 12 }} disabled={!!actionLoading} onClick={() => handleAccept(req)}>
                          {actionLoading === req.id ? "Accepting…" : "Accept"}
                        </button>
                        <button className="btn" disabled={!!actionLoading} onClick={() => handleRejectOpen(req)}>Reject</button>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </>
          ) : activeSession === "in_progress" ? (
            <>
              <h2 style={{ margin: "0 0 16px", fontSize: 18, fontWeight: 600, color: "var(--text)" }}>
                In progress ({inProgress.length})
              </h2>
              {inProgress.length === 0 ? (
                <p className="small" style={{ opacity: 0.8 }}>No requests in progress.</p>
              ) : (
                inProgress.map((req) => (
                  <div
                    key={req.id}
                    style={{
                      ...reqCardStyle,
                      borderColor: selectedRequest?.id === req.id ? "var(--cool)" : undefined,
                      background: selectedRequest?.id === req.id ? "var(--cool-soft)" : undefined,
                    }}
                    onClick={() => setSelectedRequest(selectedRequest?.id === req.id ? null : req)}
                  >
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: 8 }}>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontWeight: 600, color: "var(--text)" }}>{req.userDetails?.whatUserWants || req.intentId}</div>
                        <div className="small" style={{ marginTop: 4, opacity: 0.8 }}>
                          Accepted: {req.acceptedAt ? new Date(req.acceptedAt).toLocaleString() : "—"}
                        </div>
                        <span style={badge(req.status)}>{req.status}</span>
                      </div>
                      <div style={{ display: "flex", gap: 8 }} onClick={(e) => e.stopPropagation()}>
                        <button className="btn primary" style={{ fontSize: 12 }} disabled={!!actionLoading} onClick={() => handleCloseOpen(req)}>
                          {actionLoading === req.id ? "Closing…" : "Close request"}
                        </button>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </>
          ) : (
            <>
              <h2 style={{ margin: "0 0 16px", fontSize: 18, fontWeight: 600, color: "var(--text)" }}>
                Rejected / Closed ({rejectedOrClosed.length})
              </h2>
              {rejectedOrClosed.length === 0 ? (
                <p className="small" style={{ opacity: 0.8 }}>No rejected or closed requests yet.</p>
              ) : (
                rejectedOrClosed.map((req) => (
                  <div
                    key={req.id}
                    style={{
                      ...reqCardStyle,
                      borderColor: selectedRequest?.id === req.id ? "var(--cool)" : undefined,
                      background: selectedRequest?.id === req.id ? "var(--cool-soft)" : undefined,
                    }}
                    onClick={() => setSelectedRequest(selectedRequest?.id === req.id ? null : req)}
                  >
                    <div style={{ fontWeight: 600, color: "var(--text)" }}>{req.userDetails?.whatUserWants || req.intentId}</div>
                    <div className="small" style={{ marginTop: 4, opacity: 0.8 }}>
                      {req.createdAt && `Requested: ${new Date(req.createdAt).toLocaleString()}`}
                      {req.rejectedAt && ` · Rejected: ${new Date(req.rejectedAt).toLocaleString()}`}
                      {req.closedAt && ` · Closed: ${new Date(req.closedAt).toLocaleString()}`}
                    </div>
                    {req.rejectionReason && (
                      <div style={{ marginTop: 8, padding: 8, borderRadius: 6, backgroundColor: "var(--bad-soft)", fontSize: 12 }}>
                        Rejection: {req.rejectionReason}
                      </div>
                    )}
                    {req.resolutionNote && (
                      <div style={{ marginTop: 8, padding: 8, borderRadius: 6, backgroundColor: "var(--good-soft)", fontSize: 12 }}>
                        Resolution: {req.resolutionNote}
                      </div>
                    )}
                    <span style={badge(req.status)}>{req.status}</span>
                  </div>
                ))
              )}
            </>
          )}
        </div>

        {/* RIGHT: Request details – same slot as buyer's "Your Buying Journey" */}
        <div className="card" style={{ overflowY: "auto", padding: 14 }}>
          <div className="title" style={{ fontSize: 14, marginBottom: 10 }}>Request details</div>
          {!selectedRequest ? (
            <p className="small" style={{ opacity: 0.8 }}>Select a request from the list to view full details, timestamps, and actions.</p>
          ) : (
            <dl style={{ margin: 0, fontSize: 14 }}>
              <dt className="small" style={{ fontWeight: 600, marginTop: 12, color: "var(--muted)" }}>What user wants</dt>
              <dd style={{ margin: "4px 0 0" }}>{selectedRequest.userDetails?.whatUserWants || "—"}</dd>
              <dt className="small" style={{ fontWeight: 600, marginTop: 12, color: "var(--muted)" }}>Problem / description</dt>
              <dd style={{ margin: "4px 0 0" }}>{selectedRequest.userDetails?.problemDescription || "—"}</dd>
              <dt className="small" style={{ fontWeight: 600, marginTop: 12, color: "var(--muted)" }}>Priority / category</dt>
              <dd style={{ margin: "4px 0 0" }}>{selectedRequest.userDetails?.priority || "—"} / {selectedRequest.userDetails?.category || "—"}</dd>
              <dt className="small" style={{ fontWeight: 600, marginTop: 12, color: "var(--muted)" }}>Payload / context</dt>
              <dd style={{ margin: "4px 0 0", whiteSpace: "pre-wrap", wordBreak: "break-word", fontSize: 12 }}>
                {selectedRequest.userDetails?.payload ? JSON.stringify(selectedRequest.userDetails.payload, null, 2) : "—"}
              </dd>
              {selectedRequest.rejectionReason && (
                <>
                  <dt className="small" style={{ fontWeight: 600, marginTop: 12, color: "var(--muted)" }}>Rejection reason</dt>
                  <dd style={{ margin: "4px 0 0", padding: 8, borderRadius: 6, backgroundColor: "var(--bad-soft)", fontSize: 13 }}>{selectedRequest.rejectionReason}</dd>
                </>
              )}
              {selectedRequest.resolutionNote && (
                <>
                  <dt className="small" style={{ fontWeight: 600, marginTop: 12, color: "var(--muted)" }}>Resolution note</dt>
                  <dd style={{ margin: "4px 0 0", padding: 8, borderRadius: 6, backgroundColor: "var(--good-soft)", fontSize: 13 }}>{selectedRequest.resolutionNote}</dd>
                </>
              )}
              <dt className="small" style={{ fontWeight: 600, marginTop: 12, color: "var(--muted)" }}>Timestamps</dt>
              <dd className="small" style={{ margin: "4px 0 0" }}>
                Request: {selectedRequest.createdAt ? new Date(selectedRequest.createdAt).toLocaleString() : "—"}
                {selectedRequest.acceptedAt && <> · Accepted: {new Date(selectedRequest.acceptedAt).toLocaleString()}</>}
                {selectedRequest.rejectedAt && <> · Rejected: {new Date(selectedRequest.rejectedAt).toLocaleString()}</>}
                {selectedRequest.closedAt && <> · Closed: {new Date(selectedRequest.closedAt).toLocaleString()}</>}
              </dd>
              <div style={{ marginTop: 16, display: "flex", gap: 8, flexWrap: "wrap" }}>
                {selectedRequest.status === "PENDING" && (
                  <>
                    <button className="btn primary" style={{ fontSize: 12 }} disabled={!!actionLoading} onClick={() => handleAccept(selectedRequest)}>
                      {actionLoading === selectedRequest.id ? "Accepting…" : "Accept"}
                    </button>
                    <button className="btn" disabled={!!actionLoading} onClick={() => handleRejectOpen(selectedRequest)}>Reject</button>
                  </>
                )}
                {selectedRequest.status === "IN_PROGRESS" && (
                  <button className="btn primary" style={{ fontSize: 12 }} disabled={!!actionLoading} onClick={() => handleCloseOpen(selectedRequest)}>
                    {actionLoading === selectedRequest.id ? "Closing…" : "Close request"}
                  </button>
                )}
              </div>
            </dl>
          )}
        </div>
      </div>

      {/* Reject modal – mandatory reason */}
      {rejectModal && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.5)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1000 }} onClick={() => setRejectModal(null)}>
          <div className="card" style={{ padding: 24, maxWidth: 480, width: "100%", boxShadow: "0 4px 20px rgba(0,0,0,0.15)" }} onClick={(e) => e.stopPropagation()}>
            <h3 style={{ margin: "0 0 16px" }}>Reject request</h3>
            <p className="small" style={{ margin: "0 0 12px" }}>You must provide a reason (visible to admin and optionally to the user).</p>
            <textarea
              value={rejectReason}
              onChange={(e) => setRejectReason(e.target.value)}
              placeholder="Reason for rejection…"
              rows={4}
              className="input"
              style={{ marginBottom: 16 }}
            />
            <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
              <button className="btn" onClick={() => { setRejectModal(null); setRejectReason(""); }}>Cancel</button>
              <button className="btn primary" onClick={handleRejectSubmit} disabled={!rejectReason.trim()}>Reject</button>
            </div>
          </div>
        </div>
      )}

      {/* Close modal – resolution note */}
      {closeModal && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.5)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1000 }} onClick={() => setCloseModal(null)}>
          <div className="card" style={{ padding: 24, maxWidth: 480, width: "100%", boxShadow: "0 4px 20px rgba(0,0,0,0.15)" }} onClick={(e) => e.stopPropagation()}>
            <h3 style={{ margin: "0 0 16px" }}>Close request</h3>
            <p className="small" style={{ margin: "0 0 12px" }}>Add a summary or resolution note (optional but recommended).</p>
            <textarea
              value={closeNote}
              onChange={(e) => setCloseNote(e.target.value)}
              placeholder="Summary / resolution note…"
              rows={4}
              className="input"
              style={{ marginBottom: 16 }}
            />
            <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
              <button className="btn" onClick={() => { setCloseModal(null); setCloseNote(""); }}>Cancel</button>
              <button className="btn primary" onClick={handleCloseSubmit}>Close request</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
