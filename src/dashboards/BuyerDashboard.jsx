import { useNavigate } from "react-router-dom";
import { useState, useEffect } from "react";
import { checkResume } from "../api/intentApi";

/**
 * 🧑 BUYER DASHBOARD
 * 
 * Buyer Mindset: "Help me make the right decision. Don't overwhelm me."
 * 
 * Content:
 * 1. Active Intent (PRIMARY)
 * 2. Decisions Awaiting Me
 * 3. Actions In Progress
 * 4. Knowledge & Risk (Collapsed)
 */
export default function BuyerDashboard() {
  const navigate = useNavigate();
  const [activeIntent, setActiveIntent] = useState(null);
  const [decisions, setDecisions] = useState([]);
  const [actions, setActions] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Check for active intent
    checkResume()
      .then((data) => {
        if (data?.hasOpenIntent) {
          setActiveIntent(data);
        }
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  // Mock data for demo
  useEffect(() => {
    if (!activeIntent) {
      setDecisions([
        {
          id: "dec-1",
          type: "PROPERTY_SELECTION",
          status: "PENDING",
          recommendation: "Property A - Best match for your budget",
          risk: "LOW",
        },
      ]);
      setActions([
        {
          id: "act-1",
          description: "Schedule site visit",
          status: "PENDING",
          deadline: "2024-12-28",
        },
        {
          id: "act-2",
          description: "Upload income documents",
          status: "PENDING",
          deadline: "2024-12-30",
        },
      ]);
    }
  }, [activeIntent]);

  if (loading) {
    return (
      <div style={{ padding: 40, textAlign: "center", color: "#A0A0A0" }}>
        Loading...
      </div>
    );
  }

  return (
    <div style={{ padding: 30, maxWidth: 1200, margin: "0 auto" }}>
        {/* 1️⃣ Active Intent (PRIMARY) */}
        {activeIntent ? (
          <div
            style={{
              padding: 24,
                  backgroundColor: "#FFFFFF",
              borderRadius: 8,
                  border: "1px solid #E5E7EB",
              marginBottom: 24,
            }}
          >
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "start", marginBottom: 16 }}>
              <div>
                <h2 style={{ margin: 0, color: "#EAEAEA", fontSize: 20, fontWeight: 600 }}>
                  Active Intent
                </h2>
                <p style={{ margin: "8px 0 0", color: "#A0A0A0", fontSize: 14 }}>
                  {activeIntent.message || "Buy a home in Vizag for 50 lakhs"}
                </p>
              </div>
              <button
                onClick={() => navigate("/intent")}
                style={{
                  padding: "8px 16px",
                  backgroundColor: "#2563EB",
                  color: "#FFFFFF",
                  border: "none",
                  borderRadius: 6,
                  cursor: "pointer",
                  fontWeight: 600,
                  fontSize: 14,
                }}
              >
                Resume
              </button>
            </div>
            {/* Progress Indicator */}
            <div style={{ display: "flex", gap: 12, marginTop: 16 }}>
              {["Intent", "Compliance", "Decisions", "Actions"].map((step, idx) => (
                <div
                  key={idx}
                  style={{
                    flex: 1,
                    padding: 8,
                    backgroundColor: idx < 2 ? "#181818" : "#121212",
                    borderRadius: 4,
                    textAlign: "center",
                    fontSize: 12,
                    color: idx < 2 ? "#EAEAEA" : "#A0A0A0",
                    border: idx < 2 ? "1px solid #5B84C4" : "1px solid #242424",
                  }}
                >
                  {step}
                </div>
              ))}
            </div>
          </div>
        ) : (
          <div
            style={{
              padding: 24,
                  backgroundColor: "#FFFFFF",
              borderRadius: 8,
                  border: "1px solid #E5E7EB",
              marginBottom: 24,
              textAlign: "center",
            }}
          >
            <p style={{ color: "#A0A0A0", margin: 0 }}>
              No active intent.{" "}
              <button
                onClick={() => navigate("/intent")}
                style={{
                  background: "none",
                  border: "none",
                  color: "#5B84C4",
                  cursor: "pointer",
                  textDecoration: "underline",
                  fontSize: 14,
                }}
              >
                Start a new intent
              </button>
            </p>
          </div>
        )}

        {/* 2️⃣ Decisions Awaiting Me */}
        {decisions.length > 0 && (
          <div
            style={{
              padding: 24,
                  backgroundColor: "#FFFFFF",
              borderRadius: 8,
                  border: "1px solid #E5E7EB",
              marginBottom: 24,
            }}
          >
            <h3 style={{ margin: "0 0 16px", color: "#EAEAEA", fontSize: 18, fontWeight: 600 }}>
              Decisions Awaiting Me
            </h3>
            <div style={{ display: "grid", gap: 12 }}>
              {decisions.map((decision) => (
                <div
                  key={decision.id}
                  style={{
                    padding: 16,
                    backgroundColor: "#F9FAFB",
                    borderRadius: 6,
                    border: "1px solid #E1E4E8",
                  }}
                >
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "start", marginBottom: 8 }}>
                    <div>
                      <div style={{ color: "#EAEAEA", fontWeight: 600, marginBottom: 4 }}>
                        {decision.type.replace(/_/g, " ")}
                      </div>
                      <div style={{ color: "#A0A0A0", fontSize: 14 }}>
                        {decision.recommendation}
                      </div>
                    </div>
                    <span
                      style={{
                        padding: "4px 8px",
                        backgroundColor:
                          decision.risk === "HIGH"
                            ? "#C24B4B"
                            : decision.risk === "MEDIUM"
                            ? "#C8A24D"
                            : "#3FA36C",
                        color: "#FFFFFF",
                        borderRadius: 4,
                        fontSize: 11,
                        fontWeight: 600,
                      }}
                    >
                      {decision.risk} RISK
                    </span>
                  </div>
                  <button
                    onClick={() => navigate("/intent")}
                    style={{
                      marginTop: 12,
                      padding: "8px 16px",
                      backgroundColor: "#2563EB",
                      color: "#FFFFFF",
                      border: "none",
                      borderRadius: 6,
                      cursor: "pointer",
                      fontWeight: 600,
                      fontSize: 13,
                      width: "100%",
                    }}
                  >
                    Review Decision
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* 3️⃣ Actions In Progress */}
        {actions.length > 0 && (
          <div
            style={{
              padding: 24,
                  backgroundColor: "#FFFFFF",
              borderRadius: 8,
                  border: "1px solid #E5E7EB",
              marginBottom: 24,
            }}
          >
            <h3 style={{ margin: "0 0 16px", color: "#EAEAEA", fontSize: 18, fontWeight: 600 }}>
              Actions In Progress
            </h3>
            <div style={{ display: "grid", gap: 12 }}>
              {actions.map((action) => (
                <div
                  key={action.id}
                  style={{
                    padding: 16,
                    backgroundColor: "#F9FAFB",
                    borderRadius: 6,
                    border: "1px solid #E1E4E8",
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                  }}
                >
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
                      backgroundColor: "#242424",
                      color: "#6B7280",
                      borderRadius: 4,
                      fontSize: 11,
                      fontWeight: 500,
                    }}
                  >
                    {action.status}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* 4️⃣ Knowledge & Risk (Collapsed) */}
        <details
          style={{
            padding: 24,
                  backgroundColor: "#FFFFFF",
            borderRadius: 8,
                  border: "1px solid #E5E7EB",
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
            Knowledge & Risk
          </summary>
          <div style={{ marginTop: 16, paddingTop: 16, borderTop: "1px solid #242424" }}>
            <div style={{ color: "#A0A0A0", fontSize: 14, marginBottom: 12 }}>
              Market insights and risk analysis will appear here when you have an active intent.
            </div>
            <div style={{ display: "flex", gap: 8 }}>
              <span
                style={{
                  padding: "4px 8px",
                  backgroundColor: "#F9FAFB",
                  border: "1px solid #E1E4E8",
                  borderRadius: 4,
                  fontSize: 12,
                  color: "#6B7280",
                }}
              >
                India RAG
              </span>
              <span
                style={{
                  padding: "4px 8px",
                  backgroundColor: "#F9FAFB",
                  border: "1px solid #E1E4E8",
                  borderRadius: 4,
                  fontSize: 12,
                  color: "#6B7280",
                }}
              >
                US RAG
              </span>
            </div>
          </div>
        </details>
    </div>
  );
}
