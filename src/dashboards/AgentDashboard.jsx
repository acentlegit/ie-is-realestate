import DashboardLayout from "../layout/DashboardLayout";
import { useNavigate } from "react-router-dom";
import { useState } from "react";

/**
 * 🧑‍💼 AGENT DASHBOARD
 * 
 * Agent Mindset: "What do I need to do now?"
 * 
 * Content:
 * 1. Assigned Intents (PRIMARY)
 * 2. Actions Queue
 * 3. Compliance Alerts
 * 4. Evidence Timeline (Collapsed)
 */
export default function AgentDashboard() {
  const navigate = useNavigate();
  const [assignedIntents] = useState([
    {
      id: "intent-1",
      buyer: "John Doe",
      property: "123 Main St, Vizag",
      stage: "DECISIONS",
      priority: "HIGH",
      risk: "LOW",
    },
    {
      id: "intent-2",
      buyer: "Jane Smith",
      property: "456 Oak Ave, Mumbai",
      stage: "ACTIONS",
      priority: "MEDIUM",
      risk: "MEDIUM",
    },
  ]);

  const [actionsQueue] = useState([
    {
      id: "act-1",
      description: "Schedule site visit for John Doe",
      intent: "intent-1",
      deadline: "2024-12-27",
      risk: "LOW",
    },
    {
      id: "act-2",
      description: "Contact bank for loan verification",
      intent: "intent-2",
      deadline: "2024-12-28",
      risk: "MEDIUM",
    },
    {
      id: "act-3",
      description: "Verify property documents",
      intent: "intent-2",
      deadline: "2024-12-29",
      risk: "HIGH",
    },
  ]);

  const [complianceAlerts] = useState([
    {
      id: "alert-1",
      type: "BLOCKED",
      intent: "intent-3",
      reason: "Missing title document",
      severity: "HIGH",
    },
    {
      id: "alert-2",
      type: "MISSING_DOCS",
      intent: "intent-4",
      reason: "Income proof required",
      severity: "MEDIUM",
    },
  ]);

  return (
    <DashboardLayout>
      <div style={{ padding: 30, maxWidth: 1200, margin: "0 auto" }}>
        {/* 1️⃣ Assigned Intents (PRIMARY) */}
        <div
          style={{
            padding: 24,
                  backgroundColor: "#FFFFFF",
            borderRadius: 8,
            border: "1px solid #242424",
            marginBottom: 24,
          }}
        >
          <h2 style={{ margin: "0 0 20px", color: "#EAEAEA", fontSize: 20, fontWeight: 600 }}>
            Assigned Intents
          </h2>
          <div style={{ display: "grid", gap: 16 }}>
            {assignedIntents.map((intent) => (
              <div
                key={intent.id}
                style={{
                  padding: 20,
                  backgroundColor: "#181818",
                  borderRadius: 6,
                  border: "1px solid #E5E7EB",
                }}
              >
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "start", marginBottom: 12 }}>
                  <div>
                    <div style={{ color: "#EAEAEA", fontWeight: 600, fontSize: 16, marginBottom: 4 }}>
                      {intent.buyer}
                    </div>
                    <div style={{ color: "#A0A0A0", fontSize: 14, marginBottom: 8 }}>
                      {intent.property}
                    </div>
                    <div style={{ display: "flex", gap: 8 }}>
                      <span
                        style={{
                          padding: "4px 8px",
                          backgroundColor: "#242424",
                          color: "#6B7280",
                          borderRadius: 4,
                          fontSize: 11,
                          fontWeight: 500,
                          textTransform: "capitalize",
                        }}
                      >
                        {intent.stage}
                      </span>
                      <span
                        style={{
                          padding: "4px 8px",
                          backgroundColor:
                            intent.risk === "HIGH" ? "#C24B4B" : intent.risk === "MEDIUM" ? "#C8A24D" : "#3FA36C",
                          color: "#0A0A0A",
                          borderRadius: 4,
                          fontSize: 11,
                          fontWeight: 600,
                        }}
                      >
                        {intent.risk} RISK
                      </span>
                    </div>
                  </div>
                  <span
                    style={{
                      padding: "4px 8px",
                      backgroundColor: intent.priority === "HIGH" ? "#C24B4B" : "#C8A24D",
                      color: "#0A0A0A",
                      borderRadius: 4,
                      fontSize: 11,
                      fontWeight: 600,
                    }}
                  >
                    {intent.priority}
                  </span>
                </div>
                <button
                  onClick={() => navigate("/intent")}
                  style={{
                    marginTop: 12,
                    padding: "8px 16px",
                    backgroundColor: "#5B84C4",
                    color: "#0A0A0A",
                    border: "none",
                    borderRadius: 6,
                    cursor: "pointer",
                    fontWeight: 600,
                    fontSize: 13,
                    width: "100%",
                  }}
                >
                  View Intent
                </button>
              </div>
            ))}
          </div>
        </div>

        {/* 2️⃣ Actions Queue */}
        <div
          style={{
            padding: 24,
                  backgroundColor: "#FFFFFF",
            borderRadius: 8,
            border: "1px solid #242424",
            marginBottom: 24,
          }}
        >
          <h3 style={{ margin: "0 0 16px", color: "#EAEAEA", fontSize: 18, fontWeight: 600 }}>
            Actions Queue
          </h3>
          <div style={{ display: "grid", gap: 12 }}>
            {actionsQueue.map((action) => (
              <div
                key={action.id}
                style={{
                  padding: 16,
                  backgroundColor: "#181818",
                  borderRadius: 6,
                  border: "1px solid #E5E7EB",
                }}
              >
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "start", marginBottom: 8 }}>
                  <div>
                    <div style={{ color: "#EAEAEA", fontWeight: 500, marginBottom: 4 }}>
                      {action.description}
                    </div>
                    <div style={{ color: "#A0A0A0", fontSize: 12 }}>
                      Deadline: {new Date(action.deadline).toLocaleDateString()}
                    </div>
                  </div>
                  <span
                    style={{
                      padding: "4px 8px",
                      backgroundColor:
                        action.risk === "HIGH" ? "#C24B4B" : action.risk === "MEDIUM" ? "#C8A24D" : "#3FA36C",
                      color: "#0A0A0A",
                      borderRadius: 4,
                      fontSize: 11,
                      fontWeight: 600,
                    }}
                  >
                    {action.risk} RISK
                  </span>
                </div>
                <div style={{ display: "flex", gap: 8, marginTop: 12 }}>
                  <button
                    onClick={() => navigate("/intent")}
                    style={{
                      flex: 1,
                      padding: "8px 16px",
                      backgroundColor: "#5B84C4",
                      color: "#0A0A0A",
                      border: "none",
                      borderRadius: 6,
                      cursor: "pointer",
                      fontWeight: 600,
                      fontSize: 13,
                    }}
                  >
                    Update
                  </button>
                  <button
                    style={{
                      flex: 1,
                      padding: "8px 16px",
                      backgroundColor: "#242424",
                      color: "#6B7280",
                      border: "none",
                      borderRadius: 6,
                      cursor: "pointer",
                      fontWeight: 600,
                      fontSize: 13,
                    }}
                  >
                    Voice Update
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* 3️⃣ Compliance Alerts */}
        {complianceAlerts.length > 0 && (
          <div
            style={{
              padding: 24,
                  backgroundColor: "#FFFFFF",
              borderRadius: 8,
              border: "1px solid #242424",
              marginBottom: 24,
            }}
          >
            <h3 style={{ margin: "0 0 16px", color: "#EAEAEA", fontSize: 18, fontWeight: 600 }}>
              Compliance Alerts
            </h3>
            <div style={{ display: "grid", gap: 12 }}>
              {complianceAlerts.map((alert) => (
                <div
                  key={alert.id}
                  style={{
                    padding: 16,
                    backgroundColor: alert.severity === "HIGH" ? "#1A0A0A" : "#181818",
                    borderRadius: 6,
                    border: `1px solid ${alert.severity === "HIGH" ? "#C24B4B" : "#C8A24D"}`,
                  }}
                >
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "start" }}>
                    <div>
                      <div style={{ color: "#EAEAEA", fontWeight: 600, marginBottom: 4 }}>
                        {alert.type.replace(/_/g, " ")}
                      </div>
                      <div style={{ color: "#A0A0A0", fontSize: 14 }}>
                        {alert.reason}
                      </div>
                    </div>
                    <span
                      style={{
                        padding: "4px 8px",
                        backgroundColor: alert.severity === "HIGH" ? "#C24B4B" : "#C8A24D",
                        color: "#0A0A0A",
                        borderRadius: 4,
                        fontSize: 11,
                        fontWeight: 600,
                      }}
                    >
                      {alert.severity}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* 4️⃣ Evidence Timeline (Collapsed) */}
        <details
          style={{
            padding: 24,
                  backgroundColor: "#FFFFFF",
            borderRadius: 8,
            border: "1px solid #242424",
          }}
        >
          <summary
            style={{
              cursor: "pointer",
                  color: "#111827",
              fontWeight: 600,
              fontSize: 18,
              marginBottom: 16,
              userSelect: "none",
            }}
          >
            Evidence Timeline
          </summary>
          <div style={{ marginTop: 16, paddingTop: 16, borderTop: "1px solid #242424" }}>
            <div style={{ color: "#A0A0A0", fontSize: 14, marginBottom: 12 }}>
              Proof of work and immutable logs will appear here.
            </div>
            <div style={{ display: "flex", gap: 8 }}>
              <span
                style={{
                  padding: "4px 8px",
                  backgroundColor: "#181818",
                  border: "1px solid #E5E7EB",
                  borderRadius: 4,
                  fontSize: 12,
                  color: "#6B7280",
                }}
              >
                Work Logs
              </span>
              <span
                style={{
                  padding: "4px 8px",
                  backgroundColor: "#181818",
                  border: "1px solid #E5E7EB",
                  borderRadius: 4,
                  fontSize: 12,
                  color: "#6B7280",
                }}
              >
                Immutable Records
              </span>
            </div>
          </div>
        </details>
      </div>
    </DashboardLayout>
  );
}
