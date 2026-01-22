/**
 * Living Space UI Components - Styled sections for Intent platform
 * These components transform existing sections to use Living Space styling
 * while keeping the same data structure and logic
 */

import "../styles/living-space.css";

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

function fmtTime(ts) {
  return new Date(ts).toLocaleString();
}

/**
 * Intent Understanding Section - Living Space Style
 */
export function IntentUnderstandingSection({ result, lifecycleState }) {
  if (!result) return null;

  return (
    <div className="living-space-card" style={{ padding: 16, marginBottom: 14 }}>
      <div className="living-space-title" style={{ marginBottom: 12 }}>
        🧭 Intent Understanding
      </div>
      <div className="living-space-layout" style={{ gridTemplateColumns: "1fr 1fr", gap: 16 }}>
        <div>
          <div className="living-space-small" style={{ marginBottom: 6 }}>Intent Type</div>
          <div style={{ fontSize: 16, fontWeight: 950, color: "var(--cool)" }}>
            {result.type || "N/A"}
          </div>
        </div>
        <div>
          <div className="living-space-small" style={{ marginBottom: 6 }}>Lifecycle State</div>
          <div
            style={{
              fontSize: 16,
              fontWeight: 950,
              color:
                lifecycleState === "COMPLETED"
                  ? "var(--good)"
                  : lifecycleState === "AWAITING_DECISIONS"
                  ? "var(--warn)"
                  : "var(--cool)",
            }}
          >
            {lifecycleState || "CREATED"}
          </div>
        </div>
      </div>
      {result.confidence && (
        <div style={{ marginTop: 16 }}>
          <div className="living-space-small" style={{ marginBottom: 8 }}>Confidence</div>
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <div
              style={{
                flex: 1,
                height: 6,
                backgroundColor: "rgba(255,255,255,0.1)",
                borderRadius: 3,
                overflow: "hidden",
              }}
            >
              <div
                style={{
                  width: `${result.confidence * 100}%`,
                  height: "100%",
                  background: "linear-gradient(135deg, var(--good), var(--cool))",
                  borderRadius: 3,
                }}
              />
            </div>
            <span className="living-space-pill">
              {Math.round(result.confidence * 100)}%
            </span>
          </div>
        </div>
      )}
      {result.payload && (
        <div style={{ display: "flex", gap: 12, flexWrap: "wrap", marginTop: 16, paddingTop: 16, borderTop: "1px solid var(--stroke)" }}>
          {result.payload.location && (
            <span className="living-space-pill">📍 {result.payload.location}</span>
          )}
          {result.payload.budget && (
            <span className="living-space-pill">
              💰 ₹{(result.payload.budget / 100000).toFixed(0)}L
            </span>
          )}
          {result.payload.area && (
            <span className="living-space-pill">🏘️ {result.payload.area}</span>
          )}
        </div>
      )}
    </div>
  );
}

/**
 * Compliance Gate Section - Living Space Style (Trust Receipt)
 */
export function ComplianceGateSection({ compliance }) {
  if (!compliance) return null;

  const gateStatus = compliance.decision === "ALLOW" ? "UNLOCKED" : compliance.decision === "DENY" ? "LOCKED" : "LOCKED";
  const statusColor = compliance.decision === "ALLOW" ? "var(--good)" : compliance.decision === "DENY" ? "var(--bad)" : "var(--warn)";

  return (
    <div className="living-space-card" style={{ padding: 16, marginBottom: 14 }}>
      <div className="living-space-title" style={{ marginBottom: 12 }}>
        🛡️ Compliance Gate (Trust Receipt)
      </div>
      <div style={{ marginBottom: 16 }}>
        <div className="living-space-small" style={{ marginBottom: 8, textTransform: "uppercase", letterSpacing: "0.5px" }}>
          Status
        </div>
        <div style={{ fontSize: 24, fontWeight: 950, color: statusColor, display: "flex", alignItems: "center", gap: 10 }}>
          {compliance.decision === "ALLOW" && "✅ ALLOWED"}
          {compliance.decision === "DENY" && "❌ DENIED"}
          {compliance.decision === "REVIEW" && "⚠️ REVIEW REQUIRED"}
        </div>
      </div>
      <div style={{ marginBottom: 16 }}>
        <div className="living-space-small" style={{ marginBottom: 8 }}>Reason</div>
        <div style={{ color: "var(--text)", fontSize: 14, lineHeight: 1.6 }}>
          {safeText(compliance.reason)}
        </div>
      </div>
      {compliance.checks && compliance.checks.length > 0 && (
        <div style={{ paddingTop: 16, borderTop: "1px solid var(--stroke)" }}>
          <div className="living-space-small" style={{ marginBottom: 12 }}>Checks Performed</div>
          <div className="living-space-list">
            {compliance.checks.map((check, idx) => (
              <div key={idx} className="living-space-item" style={{ display: "flex", justifyContent: "space-between", gap: 10 }}>
                <div>
                  <b>{check.check}</b>
                  <div className="living-space-small" style={{ marginTop: 4 }}>{check.reason}</div>
                </div>
                <div className={check.passed ? "living-space-statusPass" : "living-space-statusFail"}>
                  {check.passed ? "PASS" : "FAIL"}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
      <div className="living-space-pill" style={{ marginTop: 12 }}>
        Gate: <b>{gateStatus}</b>
      </div>
    </div>
  );
}

/**
 * Decisions Section - Living Space Style
 */
export function DecisionsSection({ decisions, onDecisionSelect, loading, onDecisionChange }) {
  if (!decisions || decisions.length === 0) return null;

  return (
    <div className="living-space-card" style={{ padding: 16, marginBottom: 14 }}>
      <div className="living-space-title" style={{ marginBottom: 12 }}>
        🧠 Decisions
      </div>
      <div className="living-space-list">
        {decisions.map((decision) => {
          const isPending = decision.evolutionState === "PENDING";
          const isSelected = decision.evolutionState === "SELECTED";
          const isConfirmed = decision.evolutionState === "CONFIRMED";
          const isChanged = decision.evolutionState === "CHANGED";
          const selectedOption = decision.options?.find((opt) => opt.id === decision.selectedOptionId);

          return (
            <div key={decision.decisionId} className="living-space-item">
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
                <div style={{ fontWeight: 950 }}>{decision.type?.replace(/_/g, " ") || "Decision"}</div>
                <span
                  className="living-space-pill"
                  style={{
                    background:
                      isConfirmed
                        ? "rgba(34,197,94,0.2)"
                        : isChanged
                        ? "rgba(217,119,6,0.2)"
                        : isSelected
                        ? "rgba(59,130,246,0.2)"
                        : "rgba(255,255,255,0.06)",
                    color: isConfirmed ? "var(--good)" : isChanged ? "var(--warn)" : isSelected ? "var(--cool)" : "var(--muted)",
                  }}
                >
                  {isConfirmed ? "✅ CONFIRMED" : isChanged ? "CHANGED" : isSelected ? "SELECTED" : "PENDING"}
                </span>
              </div>
              {decision.recommendation && (
                <div style={{ padding: 10, background: "rgba(217,119,6,0.1)", borderRadius: 8, marginBottom: 12, fontSize: 13 }}>
                  <span style={{ color: "var(--warn)", marginRight: 6 }}>⭐</span>
                  <strong style={{ color: "var(--warn)" }}>Recommended:</strong> {decision.recommendation}
                </div>
              )}
              {selectedOption && (isSelected || isConfirmed || isChanged) && (
                <div
                  style={{
                    padding: 10,
                    background: isConfirmed ? "rgba(34,197,94,0.1)" : "rgba(217,119,6,0.1)",
                    border: `1px solid ${isConfirmed ? "var(--good)" : "var(--warn)"}`,
                    borderRadius: 8,
                    marginBottom: 12,
                    fontSize: 13,
                  }}
                >
                  <strong style={{ color: "var(--muted)" }}>Selected:</strong>{" "}
                  <span style={{ color: "var(--text)", fontWeight: 600 }}>{selectedOption.label}</span>
                  {decision.changeReason && (
                    <div className="living-space-small" style={{ marginTop: 6, fontStyle: "italic" }}>
                      Change reason: {decision.changeReason}
                    </div>
                  )}
                </div>
              )}
              <div style={{ display: "grid", gap: 8 }}>
                {decision.options?.map((option) => {
                  const isSelectedOption = option.id === decision.selectedOptionId;
                  return (
                    <button
                      key={option.id}
                      onClick={() => {
                        if (isConfirmed && onDecisionChange) {
                          onDecisionChange(decision, option.id);
                        } else {
                          onDecisionSelect(decision.decisionId, option.id, isConfirmed);
                        }
                      }}
                      disabled={loading}
                      className="living-space-btn"
                      style={{
                        textAlign: "left",
                        background: isSelectedOption ? "rgba(59,130,246,0.2)" : "rgba(255,255,255,0.06)",
                        borderColor: isSelectedOption ? "var(--cool)" : option.recommended ? "var(--warn)" : "var(--stroke)",
                        color: isSelectedOption ? "var(--text)" : "var(--muted)",
                      }}
                    >
                      <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 6 }}>
                        <span>{isSelectedOption ? "[✓]" : "[ ]"}</span>
                        <strong>{option.label}</strong>
                        {option.recommended && <span className="living-space-pill" style={{ marginLeft: "auto" }}>⭐ Recommended</span>}
                      </div>
                      {option.description && (
                        <div className="living-space-small" style={{ marginTop: 4, paddingLeft: 20 }}>
                          {option.description}
                        </div>
                      )}
                    </button>
                  );
                })}
              </div>
              {isSelected && !isConfirmed && (
                <button
                  onClick={() => onDecisionSelect(decision.decisionId, decision.selectedOptionId, true)}
                  disabled={loading}
                  className="living-space-btn primary"
                  style={{ marginTop: 12, width: "100%" }}
                >
                  Confirm Selection
                </button>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

/**
 * Actions Section - Living Space Style
 */
export function ActionsSection({ actions, onActionOutcome, loading }) {
  if (!actions || actions.length === 0) return null;

  return (
    <div className="living-space-card" style={{ padding: 16, marginBottom: 14 }}>
      <div className="living-space-title" style={{ marginBottom: 12 }}>
        ⚡ Actions
      </div>
      <div className="living-space-list">
        {actions.map((action) => {
          const isCompleted = action.outcome === "COMPLETED";
          const isFailed = action.outcome === "FAILED";
          const isBlocked = action.outcome === "BLOCKED";
          const isRescheduled = action.outcome === "RESCHEDULED";

          return (
            <div key={action.actionId} className="living-space-item">
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
                <div style={{ fontWeight: 950 }}>{action.description || action.title || "Action"}</div>
                <span
                  className="living-space-pill"
                  style={{
                    background:
                      isCompleted
                        ? "rgba(34,197,94,0.2)"
                        : isFailed || isBlocked
                        ? "rgba(239,68,68,0.2)"
                        : isRescheduled
                        ? "rgba(217,119,6,0.2)"
                        : "rgba(255,255,255,0.06)",
                    color:
                      isCompleted
                        ? "var(--good)"
                        : isFailed || isBlocked
                        ? "var(--bad)"
                        : isRescheduled
                        ? "var(--warn)"
                        : "var(--muted)",
                  }}
                >
                  {action.outcome || action.status || "PENDING"}
                </span>
              </div>
              {action.guidance && (
                <div style={{ padding: 8, background: "rgba(59,130,246,0.1)", borderRadius: 6, marginBottom: 12, fontSize: 12 }}>
                  💡 {action.guidance}
                </div>
              )}
              {(action.outcomeReason || action.scheduledFor) && (
                <div className="living-space-small" style={{ marginBottom: 12 }}>
                  {action.outcomeReason && <div>Reason: {action.outcomeReason}</div>}
                  {action.scheduledFor && <div>Scheduled: {new Date(action.scheduledFor).toLocaleDateString()}</div>}
                </div>
              )}
              {!isCompleted && !isFailed && !isBlocked && (
                <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                  <button
                    className="living-space-btn primary"
                    onClick={() => onActionOutcome(action.actionId, "COMPLETED", "Action completed")}
                    disabled={loading}
                  >
                    Complete
                  </button>
                  <button
                    className="living-space-btn"
                    onClick={() => onActionOutcome(action.actionId, "FAILED", "Action failed")}
                    disabled={loading}
                  >
                    Fail
                  </button>
                  <button
                    className="living-space-btn"
                    onClick={() => onActionOutcome(action.actionId, "RESCHEDULED", "Action rescheduled")}
                    disabled={loading}
                  >
                    Reschedule
                  </button>
                  <button
                    className="living-space-btn"
                    onClick={() => onActionOutcome(action.actionId, "SKIPPED", "Action skipped")}
                    disabled={loading}
                  >
                    Skip
                  </button>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

/**
 * Chat Panel - Living Space Style
 */
export function ChatPanelSection({ messages, onSendMessage, chatInput, setChatInput }) {
  return (
    <div className="living-space-card" style={{ padding: 16, marginBottom: 14 }}>
      <div className="living-space-title" style={{ marginBottom: 12 }}>
        💬 Chat + Intent Processing
      </div>
      <div className="living-space-chatBox">
        {messages.length === 0 ? (
          <div className="living-space-small" style={{ textAlign: "center", padding: 20, color: "var(--muted)" }}>
            No messages yet. Start a conversation...
          </div>
        ) : (
          [...messages].slice(-10).reverse().map((m) => (
            <div key={m.id || m.messageId} className="living-space-msg">
              <b>{m.userId || m.user}</b> <span className="t">{fmtTime(m.createdAt || m.timestamp)}</span>
              <div style={{ marginTop: 6 }}>{safeText(m.text || m.message)}</div>
            </div>
          ))
        )}
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
              onSendMessage();
            }
          }}
        />
        <button className="living-space-btn primary" onClick={onSendMessage}>
          Send
        </button>
      </div>
    </div>
  );
}

/**
 * Sub-Intents Section - Living Space Style
 */
export function SubIntentsSection({ subIntents }) {
  if (!subIntents || subIntents.length === 0) return null;

  return (
    <div style={{ marginBottom: 14 }}>
      <div className="living-space-small" style={{ marginBottom: 12 }}>🧩 Derived Sub-Intents</div>
      <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
        {subIntents.map((subIntent, index) => (
          <span key={index} className="living-space-pill">
            {subIntent.replace(/_/g, " ")}
          </span>
        ))}
      </div>
    </div>
  );
}
