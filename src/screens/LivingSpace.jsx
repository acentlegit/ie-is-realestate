/**
 * Living Learning Space UI - Single-page, everything visible
 * Maps to existing Intent/Decision/Compliance/Evidence engines
 */

import { useState, useEffect, useMemo } from "react";
import {
  analyzeIntent,
  checkCompliance,
  getDecisions,
  getActions,
  selectDecision,
  updateActionOutcome,
  getEvidenceByIntent,
  queryRAG,
} from "../api/intentApi";
import keycloak from "../auth/keycloakAuth";
import "../styles/living-space.css";

function fmtTime(ts) {
  return new Date(ts).toLocaleString();
}

function safeText(v) {
  if (v === null || v === undefined) return "";
  const t = typeof v;
  if (t === "string" || t === "number" || t === "boolean") return String(v);
  try {
    return JSON.stringify(v);
  } catch {
    return String(v);
  }
}

const TABS = [
  { key: "core", label: "Core + Trust" },
  { key: "decisions", label: "Decisions" },
  { key: "actions", label: "Actions" },
  { key: "evidence", label: "Evidence" },
];

export default function LivingSpace({ intent, onIntentUpdate }) {
  const [currentIntent, setCurrentIntent] = useState(intent);
  const [compliance, setCompliance] = useState(null);
  const [decisions, setDecisions] = useState([]);
  const [actions, setActions] = useState([]);
  const [evidence, setEvidence] = useState([]);
  const [ragResponse, setRagResponse] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const [tab, setTab] = useState("core");
  const [chatInput, setChatInput] = useState("");
  const [messages, setMessages] = useState([
    {
      id: "sys1",
      userId: "system",
      text: "Welcome to Living Learning Space — Intent-driven real estate platform.",
      createdAt: Date.now(),
    },
  ]);

  const [decisionResponse, setDecisionResponse] = useState(null);
  const [complianceResponse, setComplianceResponse] = useState(null);

  const userId = keycloak.tokenParsed?.preferred_username || "user1";
  const tenantId = "intent-platform";

  // Load initial data when intent is available
  useEffect(() => {
    if (currentIntent) {
      loadIntentData();
    }
  }, [currentIntent?.id]);

  async function loadIntentData() {
    if (!currentIntent) return;

    setLoading(true);
    try {
      // Load Compliance
      const comp = await checkCompliance(currentIntent);
      setCompliance(comp);
      setComplianceResponse(comp);

      // Load Decisions
      const decs = await getDecisions(currentIntent, comp?.compliant || false);
      setDecisions(decs.decisions || []);

      // Load Actions
      const acts = await getActions(
        currentIntent,
        decs.decisions || [],
        decs.lifecycleState || "AWAITING_DECISIONS"
      );
      setActions(acts.actions || []);

      // Load Evidence
      try {
        const ev = await getEvidenceByIntent(currentIntent.id);
        setEvidence(ev.evidence || []);
      } catch (e) {
        console.warn("[Evidence] Not available:", e.message);
      }

      // Load RAG (if available)
      try {
        const rag = await queryRAG(currentIntent);
        setRagResponse(rag);
      } catch (e) {
        console.warn("[RAG] Not available:", e.message);
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  // 🔹 STEP 4: Chat Message → Intent Engine
  async function handleSendChat() {
    if (!chatInput.trim() || !currentIntent) return;

    const newMsg = {
      id: `msg_${Date.now()}`,
      userId,
      text: chatInput,
      createdAt: Date.now(),
    };
    setMessages((prev) => [...prev, newMsg]);
    setChatInput("");

    try {
      // Call Intent Engine for chat processing
      const intentUpdate = await analyzeIntent({
        intentType: currentIntent.type,
        payload: {
          ...currentIntent.payload,
          text: chatInput,
        },
        tenantId,
        actorId: userId,
      });

      // Update intent if needed
      if (intentUpdate) {
        setCurrentIntent(intentUpdate);
        if (onIntentUpdate) onIntentUpdate(intentUpdate);
      }
    } catch (err) {
      console.warn("[Chat] Intent Engine not available:", err.message);
    }
  }

  // 🔹 STEP 4: Accept/Reject → Decision Engine
  async function handleDecisionSelect(decisionId, optionId) {
    try {
      const result = await selectDecision(decisionId, optionId, userId, true);
      setDecisionResponse(result);
      // Reload decisions
      await loadIntentData();
    } catch (err) {
      setError(err.message);
    }
  }

  // 🔹 STEP 4: Action Outcome → Action Engine
  async function handleActionOutcome(actionId, outcome, reason) {
    try {
      await updateActionOutcome(actionId, outcome, userId, reason);
      // Reload actions
      await loadIntentData();
    } catch (err) {
      setError(err.message);
    }
  }

  // Map compliance to Trust Receipt format
  const trustReceipt = useMemo(() => {
    if (!compliance) return null;

    const checkpoints = [
      {
        name: "Compliance Status",
        status: compliance.compliant ? "PASS" : "FAIL",
        note: compliance.compliant ? "All requirements met" : "Compliance issues found",
      },
      ...(compliance.violations || []).map((v) => ({
        name: "Violation",
        status: "FAIL",
        note: v,
      })),
      ...(compliance.warnings || []).map((w) => ({
        name: "Warning",
        status: "WARN",
        note: w,
      })),
    ];

    return {
      summary: compliance.compliant
        ? "Trust Receipt: Ready for approval"
        : "Trust Receipt: Not ready. Complete required checkpoints.",
      checkpoints,
      gate: compliance.compliant ? "UNLOCKED" : "LOCKED",
      gateReason: compliance.gateReason || compliance.reason || "Compliance check required",
    };
  }, [compliance]);

  if (!currentIntent) {
    return (
      <div className="living-space-container">
        <div className="living-space-card">
          <div className="living-space-title">No Intent Found</div>
          <p>Please create an intent first.</p>
        </div>
      </div>
    );
  }

  return (
    <div
      className="living-space-container"
      style={{
        background:
          "radial-gradient(900px 600px at 10% -5%, rgba(34,197,94,.14), transparent 55%), radial-gradient(900px 600px at 110% 0%, rgba(59,130,246,.18), transparent 55%), radial-gradient(700px 500px at 50% 120%, rgba(168,85,247,.14), transparent 55%), linear-gradient(180deg, #030614 0%, var(--bg) 100%)",
        minHeight: "100vh",
      }}
    >
      <div className="living-space-topbar">
        <div>
          <div className="living-space-h1">
            Living Learning Space — Real Estate Intent Platform
          </div>
          <div className="living-space-sub">
            Intent Engine · Decision Engine · Compliance Engine · Evidence Engine
          </div>
        </div>
        <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
          <button className="living-space-btn" onClick={loadIntentData}>
            Refresh
          </button>
          <span className="living-space-pill">
            Intent: <b>{currentIntent.type || "N/A"}</b>
          </span>
        </div>
      </div>

      {error && (
        <div
          style={{
            marginTop: 14,
            padding: 12,
            background: "rgba(239,68,68,0.2)",
            border: "1px solid rgba(239,68,68,0.4)",
            borderRadius: 12,
            color: "var(--bad)",
          }}
        >
          Error: {error}
        </div>
      )}

      <div className="living-space-grid" style={{ marginTop: 14 }}>
        {/* Left: Intent Info */}
        <div className="living-space-card">
          <div className="living-space-title">Current Intent</div>
          <div className="living-space-item">
            <div style={{ fontWeight: 950 }}>{currentIntent.type || "BUY_PROPERTY"}</div>
            <div className="living-space-small" style={{ marginTop: 6 }}>
              ID: {currentIntent.id}
            </div>
            {currentIntent.payload?.location && (
              <div className="living-space-small" style={{ marginTop: 6 }}>
                Location: {currentIntent.payload.location}
              </div>
            )}
            {currentIntent.payload?.budget && (
              <div className="living-space-small" style={{ marginTop: 6 }}>
                Budget: ₹{currentIntent.payload.budget?.toLocaleString()}
              </div>
            )}
            {ragResponse?.summary && (
              <div className="living-space-small" style={{ marginTop: 8, padding: 8, background: "rgba(100,150,255,0.1)", borderRadius: 6 }}>
                <b>RAG Summary:</b> {ragResponse.summary.substring(0, 100)}...
              </div>
            )}
          </div>
        </div>

        {/* Right: Main Content */}
        <div className="living-space-card">
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12 }}>
            <div>
              <div className="living-space-title">Intent: {currentIntent.type || "BUY_PROPERTY"}</div>
              <div className="living-space-small">
                {currentIntent.payload?.text || "Real estate intent processing"}
              </div>
            </div>
            {compliance && (
              <span className="living-space-pill">
                Compliance: <b>{compliance.compliant ? "✅" : "⚠️"}</b>
              </span>
            )}
          </div>

          <div className="living-space-tabs">
            {TABS.map((t) => (
              <div
                key={t.key}
                className={`living-space-tab ${tab === t.key ? "active" : ""}`}
                onClick={() => setTab(t.key)}
              >
                {t.label}
              </div>
            ))}
          </div>

          <div className="living-space-layout" style={{ marginTop: 12 }}>
            {/* Left Column */}
            <div>
              {/* AI Concierge / Intent Info */}
              <div className="living-space-card" style={{ padding: 12 }}>
                <div className="living-space-title">AI Concierge</div>
                <div style={{ marginBottom: 12, padding: 8, background: "rgba(100,150,255,0.1)", borderRadius: 6 }}>
                  <div style={{ fontWeight: "bold", marginBottom: 4 }}>📋 Current Intent:</div>
                  <div className="living-space-small">
                    <b>Type:</b> {currentIntent.type || "N/A"}
                  </div>
                  {ragResponse?.summary && (
                    <div className="living-space-small" style={{ marginTop: 4 }}>
                      <b>Summary:</b> {ragResponse.summary.substring(0, 150)}...
                    </div>
                  )}
                  {ragResponse?.valuation_hint?.confidence && (
                    <div className="living-space-small" style={{ marginTop: 4 }}>
                      <b>Confidence:</b> {(ragResponse.valuation_hint.confidence * 100).toFixed(0)}%
                    </div>
                  )}
                </div>
                {ragResponse?.nextActions && ragResponse.nextActions.length > 0 && (
                  <div className="living-space-item" style={{ marginTop: 10 }}>
                    <b>Next Actions</b>
                    <ul style={{ marginTop: 6, paddingLeft: 20 }}>
                      {ragResponse.nextActions.map((action, i) => (
                        <li key={i} className="living-space-small">
                          {safeText(action)}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>

              {/* Chat Panel */}
              <div className="living-space-section living-space-card" style={{ padding: 12 }}>
                <div className="living-space-title">Chat + Intent Processing</div>
                <div className="living-space-chatBox">
                  {[...messages].slice(-10).reverse().map((m) => (
                    <div key={m.id} className="living-space-msg">
                      <b>{m.userId}</b> <span className="t">{fmtTime(m.createdAt)}</span>
                      <div style={{ marginTop: 6 }}>{m.text}</div>
                    </div>
                  ))}
                </div>

                <div style={{ display: "flex", gap: 10, marginTop: 10 }}>
                  <input
                    className="living-space-input"
                    value={chatInput}
                    onChange={(e) => setChatInput(e.target.value)}
                    placeholder="Type your message..."
                    onKeyDown={(e) => {
                      if (e.key === "Enter" && !e.shiftKey) {
                        e.preventDefault();
                        handleSendChat();
                      }
                    }}
                  />
                  <button className="living-space-btn primary" onClick={handleSendChat}>
                    Send
                  </button>
                </div>
              </div>
            </div>

            {/* Right Column */}
            <div>
              {tab === "core" && (
                <>
                  {/* Trust Receipt / Compliance */}
                  {trustReceipt && (
                    <div className="living-space-card" style={{ padding: 12 }}>
                      <div className="living-space-title">Trust Receipt (Compliance Gate)</div>
                      <div className="living-space-small">{trustReceipt.summary}</div>

                      {/* Compliance Engine Response */}
                      {complianceResponse && (
                        <div
                          style={{
                            marginTop: 10,
                            marginBottom: 10,
                            padding: 8,
                            background: "rgba(255,200,0,0.1)",
                            borderRadius: 6,
                            border: "1px solid rgba(255,200,0,0.3)",
                          }}
                        >
                          <div style={{ fontWeight: "bold", marginBottom: 4 }}>🛡️ Compliance Engine:</div>
                          <div className="living-space-small">
                            <b>Status:</b> {complianceResponse.compliant ? "✅ Compliant" : "⚠️ Non-Compliant"}
                          </div>
                          <div className="living-space-small">
                            <b>Gate:</b> {trustReceipt.gate}
                          </div>
                          <div className="living-space-small">
                            <b>Reason:</b> {safeText(trustReceipt.gateReason)}
                          </div>
                          {Array.isArray(complianceResponse.requiredActions) &&
                            complianceResponse.requiredActions.length > 0 && (
                              <div className="living-space-small" style={{ marginTop: 4 }}>
                                <b>Required:</b> {complianceResponse.requiredActions.join(", ")}
                              </div>
                            )}
                        </div>
                      )}

                      <div className="living-space-list" style={{ marginTop: 10 }}>
                        {trustReceipt.checkpoints.map((c, i) => (
                          <div
                            key={i}
                            className="living-space-item"
                            style={{ display: "flex", justifyContent: "space-between", gap: 10 }}
                          >
                            <div>
                              <b>{c.name}</b>
                              <div className="living-space-small">{c.note}</div>
                            </div>
                            <div
                              className={
                                c.status === "PASS"
                                  ? "living-space-statusPass"
                                  : c.status === "WARN"
                                  ? "living-space-statusWarn"
                                  : "living-space-statusFail"
                              }
                            >
                              {c.status}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Decision Engine Response */}
                  {decisionResponse && (
                    <div className="living-space-section living-space-card" style={{ padding: 12 }}>
                      <div className="living-space-title">Decision Engine Response</div>
                      <div
                        style={{
                          marginTop: 10,
                          padding: 10,
                          background: "rgba(0,255,0,0.1)",
                          borderRadius: 6,
                          border: "1px solid rgba(0,255,0,0.3)",
                        }}
                      >
                        <div style={{ fontWeight: "bold", marginBottom: 6 }}>✅ Decision:</div>
                        <div className="living-space-small">
                          <b>Result:</b> {safeText(decisionResponse.decision || decisionResponse.result)}
                        </div>
                        {decisionResponse.confidence && (
                          <div className="living-space-small">
                            <b>Confidence:</b> {(decisionResponse.confidence * 100).toFixed(0)}%
                          </div>
                        )}
                        {decisionResponse.reason && (
                          <div className="living-space-small">
                            <b>Reason:</b> {safeText(decisionResponse.reason)}
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </>
              )}

              {tab === "decisions" && (
                <div className="living-space-card" style={{ padding: 12 }}>
                  <div className="living-space-title">Decisions</div>
                  {decisions.length === 0 ? (
                    <div className="living-space-small">No decisions available yet.</div>
                  ) : (
                    <div className="living-space-list">
                      {decisions.map((d) => (
                        <div key={d.id} className="living-space-item">
                          <div style={{ fontWeight: 950 }}>{d.title || d.description}</div>
                          <div className="living-space-small" style={{ marginTop: 6 }}>
                            {d.description || safeText(d)}
                          </div>
                          {d.options && d.options.length > 0 && (
                            <div style={{ marginTop: 10 }}>
                              {d.options.map((opt) => (
                                <button
                                  key={opt.id}
                                  className="living-space-btn"
                                  style={{ marginRight: 8, marginTop: 6 }}
                                  onClick={() => handleDecisionSelect(d.id, opt.id)}
                                >
                                  {opt.label || opt.title}
                                </button>
                              ))}
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {tab === "actions" && (
                <div className="living-space-card" style={{ padding: 12 }}>
                  <div className="living-space-title">Actions</div>
                  {actions.length === 0 ? (
                    <div className="living-space-small">No actions available yet.</div>
                  ) : (
                    <div className="living-space-list">
                      {actions.map((a) => (
                        <div key={a.id} className="living-space-item">
                          <div style={{ fontWeight: 950 }}>{a.title || a.description}</div>
                          <div className="living-space-small" style={{ marginTop: 6 }}>
                            {a.description || safeText(a)}
                          </div>
                          <div style={{ marginTop: 10, display: "flex", gap: 8 }}>
                            <button
                              className="living-space-btn primary"
                              onClick={() => handleActionOutcome(a.id, "COMPLETED", "Action completed")}
                            >
                              Complete
                            </button>
                            <button
                              className="living-space-btn"
                              onClick={() => handleActionOutcome(a.id, "FAILED", "Action failed")}
                            >
                              Failed
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {tab === "evidence" && (
                <div className="living-space-card" style={{ padding: 12 }}>
                  <div className="living-space-title">Evidence Trail</div>
                  {evidence.length === 0 ? (
                    <div className="living-space-small">No evidence recorded yet.</div>
                  ) : (
                    <div className="living-space-list">
                      {evidence.map((e, i) => (
                        <div key={i} className="living-space-item">
                          <div style={{ fontWeight: 950 }}>{e.type || "Evidence"}</div>
                          <div className="living-space-small" style={{ marginTop: 6 }}>
                            {safeText(e.description || e.reason || e)}
                          </div>
                          {e.timestamp && (
                            <div className="living-space-small" style={{ marginTop: 4 }}>
                              {fmtTime(e.timestamp)}
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
