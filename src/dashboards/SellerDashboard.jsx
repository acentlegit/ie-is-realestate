import { useNavigate } from "react-router-dom";
import { useState } from "react";

/**
 * 🏠 SELLER DASHBOARD
 * 
 * Seller Mindset: "Show me demand, compliance, and next steps."
 * 
 * Content:
 * 1. Property Overview
 * 2. Buyer Activity
 * 3. Required Actions
 * 4. Evidence & Compliance (Collapsed)
 */
export default function SellerDashboard() {
  const navigate = useNavigate();
  const [properties] = useState([
    {
      id: "prop-1",
      address: "123 Main St, Vizag",
      status: "ACTIVE",
      compliance: "COMPLIANT",
      risk: "LOW",
      buyers: 3,
    },
    {
      id: "prop-2",
      address: "456 Oak Ave, Mumbai",
      status: "PENDING",
      compliance: "REVIEW",
      risk: "MEDIUM",
      buyers: 1,
    },
  ]);

  const [buyerActivity] = useState([
    {
      id: "buyer-1",
      property: "123 Main St, Vizag",
      stage: "viewing",
      interest: "HIGH",
    },
    {
      id: "buyer-2",
      property: "123 Main St, Vizag",
      stage: "negotiation",
      interest: "MEDIUM",
    },
  ]);

  const [requiredActions] = useState([
    {
      id: "act-1",
      description: "Upload property title document",
      property: "456 Oak Ave, Mumbai",
      priority: "HIGH",
      deadline: "2024-12-27",
    },
    {
      id: "act-2",
      description: "Approve site visit request",
      property: "123 Main St, Vizag",
      priority: "MEDIUM",
      deadline: "2024-12-28",
    },
  ]);

  return (
    <div style={{ padding: 30, maxWidth: 1200, margin: "0 auto" }}>
        {/* 1️⃣ Property Overview */}
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
            Property Overview
          </h2>
          <div style={{ display: "grid", gap: 16 }}>
            {properties.map((property) => (
              <div
                key={property.id}
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
                      {property.address}
                    </div>
                    <div style={{ display: "flex", gap: 12, marginTop: 8 }}>
                      <span
                        style={{
                          padding: "4px 8px",
                          backgroundColor:
                            property.status === "ACTIVE" ? "#3FA36C" : "#C8A24D",
                          color: "#0A0A0A",
                          borderRadius: 4,
                          fontSize: 11,
                          fontWeight: 600,
                        }}
                      >
                        {property.status}
                      </span>
                      <span
                        style={{
                          padding: "4px 8px",
                          backgroundColor:
                            property.compliance === "COMPLIANT" ? "#3FA36C" : "#C8A24D",
                          color: "#0A0A0A",
                          borderRadius: 4,
                          fontSize: 11,
                          fontWeight: 600,
                        }}
                      >
                        {property.compliance}
                      </span>
                      <span
                        style={{
                          padding: "4px 8px",
                          backgroundColor:
                            property.risk === "HIGH" ? "#C24B4B" : property.risk === "MEDIUM" ? "#C8A24D" : "#3FA36C",
                          color: "#0A0A0A",
                          borderRadius: 4,
                          fontSize: 11,
                          fontWeight: 600,
                        }}
                      >
                        {property.risk} RISK
                      </span>
                    </div>
                  </div>
                  <div style={{ textAlign: "right" }}>
                    <div style={{ color: "#A0A0A0", fontSize: 12, marginBottom: 4 }}>Interested Buyers</div>
                    <div style={{ color: "#EAEAEA", fontSize: 20, fontWeight: 600 }}>{property.buyers}</div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* 2️⃣ Buyer Activity */}
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
            Buyer Activity
          </h3>
          <div style={{ display: "grid", gap: 12 }}>
            {buyerActivity.map((buyer) => (
              <div
                key={buyer.id}
                style={{
                  padding: 16,
                  backgroundColor: "#181818",
                  borderRadius: 6,
                  border: "1px solid #E5E7EB",
                }}
              >
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <div>
                    <div style={{ color: "#EAEAEA", fontWeight: 500, marginBottom: 4 }}>
                      {buyer.property}
                    </div>
                    <div style={{ color: "#A0A0A0", fontSize: 12 }}>
                      Stage: {buyer.stage} • Interest: {buyer.interest}
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
                      textTransform: "capitalize",
                    }}
                  >
                    {buyer.stage}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* 3️⃣ Required Actions */}
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
            Required Actions
          </h3>
          <div style={{ display: "grid", gap: 12 }}>
            {requiredActions.map((action) => (
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
                      {action.property} • Deadline: {new Date(action.deadline).toLocaleDateString()}
                    </div>
                  </div>
                  <span
                    style={{
                      padding: "4px 8px",
                      backgroundColor: action.priority === "HIGH" ? "#C24B4B" : "#C8A24D",
                      color: "#0A0A0A",
                      borderRadius: 4,
                      fontSize: 11,
                      fontWeight: 600,
                    }}
                  >
                    {action.priority}
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
                  Take Action
                </button>
              </div>
            ))}
          </div>
        </div>

        {/* 4️⃣ Evidence & Compliance (Collapsed) */}
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
            Evidence & Compliance
          </summary>
          <div style={{ marginTop: 16, paddingTop: 16, borderTop: "1px solid #242424" }}>
            <div style={{ color: "#A0A0A0", fontSize: 14, marginBottom: 12 }}>
              Proof of disclosures and legal records will appear here.
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
                Disclosure Records
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
                Legal Compliance
              </span>
            </div>
          </div>
        </details>
    </div>
  );
}
