import DashboardLayout from "../layout/DashboardLayout";
import { useState } from "react";

/**
 * 🛡️ ADMIN DASHBOARD
 * 
 * Admin Mindset: "Is the system safe, compliant, and healthy?"
 * 
 * Content:
 * 1. System Health
 * 2. Policy Versions
 * 3. Risk Distribution
 * 4. Evidence Integrity
 */
export default function AdminDashboard() {
  const [systemHealth] = useState({
    engines: [
      { name: "Intent Engine", status: "HEALTHY", latency: "45ms" },
      { name: "Compliance Engine", status: "HEALTHY", latency: "120ms" },
      { name: "Risk Engine", status: "WARNING", latency: "250ms" },
      { name: "Decision Engine", status: "HEALTHY", latency: "80ms" },
      { name: "Evidence Engine", status: "HEALTHY", latency: "30ms" },
    ],
    failures: 2,
    last24h: 0,
  });

  const [policyVersions] = useState({
    active: "v2.1.0",
    lastUpdated: "2024-12-20",
    impactedIntents: 45,
  });

  const [riskDistribution] = useState({
    LOW: 120,
    MEDIUM: 35,
    HIGH: 8,
    trend: "Stable",
  });

  const [evidenceIntegrity] = useState({
    verified: 163,
    total: 163,
    status: "INTEGRITY_OK",
  });

  return (
    <DashboardLayout>
      <div style={{ padding: 30, maxWidth: 1200, margin: "0 auto" }}>
        {/* 1️⃣ System Health */}
        <div
          style={{
            padding: 24,
                  backgroundColor: "#FFFFFF",
            borderRadius: 8,
            border: "1px solid #E5E7EB",
            marginBottom: 24,
          }}
        >
          <h2 style={{ margin: "0 0 20px", color: "#EAEAEA", fontSize: 20, fontWeight: 600 }}>
            System Health
          </h2>
          <div style={{ display: "grid", gap: 12, marginBottom: 16 }}>
            {systemHealth.engines.map((engine) => (
              <div
                key={engine.name}
                style={{
                  padding: 16,
                  backgroundColor: "#F9FAFB",
                  borderRadius: 6,
                  border: "1px solid #E5E7EB",
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                }}
              >
                <div>
                  <div style={{ color: "#EAEAEA", fontWeight: 500, marginBottom: 4 }}>
                    {engine.name}
                  </div>
                  <div style={{ color: "#A0A0A0", fontSize: 12 }}>
                    Latency: {engine.latency}
                  </div>
                </div>
                <span
                  style={{
                    padding: "4px 8px",
                    backgroundColor:
                      engine.status === "HEALTHY"
                        ? "#16A34A"
                        : engine.status === "WARNING"
                        ? "#D97706"
                        : "#DC2626",
                    color: "#FFFFFF",
                    borderRadius: 4,
                    fontSize: 11,
                    fontWeight: 600,
                  }}
                >
                  {engine.status}
                </span>
              </div>
            ))}
          </div>
          <div style={{ display: "flex", gap: 16, paddingTop: 16, borderTop: "1px solid #242424" }}>
            <div>
              <div style={{ color: "#A0A0A0", fontSize: 12, marginBottom: 4 }}>Total Failures</div>
              <div style={{ color: "#EAEAEA", fontSize: 20, fontWeight: 600 }}>{systemHealth.failures}</div>
            </div>
            <div>
              <div style={{ color: "#A0A0A0", fontSize: 12, marginBottom: 4 }}>Last 24h</div>
              <div style={{ color: "#EAEAEA", fontSize: 20, fontWeight: 600 }}>{systemHealth.last24h}</div>
            </div>
          </div>
        </div>

        {/* 2️⃣ Policy Versions */}
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
            Policy Versions
          </h3>
          <div style={{ padding: 16, backgroundColor: "#181818", borderRadius: 6, border: "1px solid #242424" }}>
            <div style={{ display: "grid", gap: 12 }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <div>
                  <div style={{ color: "#EAEAEA", fontWeight: 500, marginBottom: 4 }}>Active Policy Set</div>
                  <div style={{ color: "#A0A0A0", fontSize: 14 }}>{policyVersions.active}</div>
                </div>
                <span
                  style={{
                    padding: "4px 8px",
                    backgroundColor: "#16A34A",
                    color: "#FFFFFF",
                    borderRadius: 4,
                    fontSize: 11,
                    fontWeight: 600,
                  }}
                >
                  ACTIVE
                </span>
              </div>
              <div style={{ paddingTop: 12, borderTop: "1px solid #242424" }}>
                <div style={{ color: "#A0A0A0", fontSize: 12, marginBottom: 4 }}>Last Updated</div>
                <div style={{ color: "#EAEAEA", fontSize: 14 }}>
                  {new Date(policyVersions.lastUpdated).toLocaleDateString()}
                </div>
              </div>
              <div style={{ paddingTop: 12, borderTop: "1px solid #242424" }}>
                <div style={{ color: "#A0A0A0", fontSize: 12, marginBottom: 4 }}>Impacted Intents</div>
                <div style={{ color: "#EAEAEA", fontSize: 20, fontWeight: 600 }}>
                  {policyVersions.impactedIntents}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* 3️⃣ Risk Distribution */}
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
            Risk Distribution
          </h3>
          <div style={{ display: "grid", gap: 12 }}>
            <div
              style={{
                padding: 16,
                backgroundColor: "#181818",
                borderRadius: 6,
                border: "1px solid #E5E7EB",
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
              }}
            >
              <div>
                <div style={{ color: "#EAEAEA", fontWeight: 500 }}>LOW</div>
                <div style={{ color: "#A0A0A0", fontSize: 12 }}>Risk Level</div>
              </div>
              <div style={{ color: "#3FA36C", fontSize: 24, fontWeight: 600 }}>{riskDistribution.LOW}</div>
            </div>
            <div
              style={{
                padding: 16,
                backgroundColor: "#181818",
                borderRadius: 6,
                border: "1px solid #E5E7EB",
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
              }}
            >
              <div>
                <div style={{ color: "#EAEAEA", fontWeight: 500 }}>MEDIUM</div>
                <div style={{ color: "#A0A0A0", fontSize: 12 }}>Risk Level</div>
              </div>
              <div style={{ color: "#C8A24D", fontSize: 24, fontWeight: 600 }}>{riskDistribution.MEDIUM}</div>
            </div>
            <div
              style={{
                padding: 16,
                backgroundColor: "#181818",
                borderRadius: 6,
                border: "1px solid #E5E7EB",
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
              }}
            >
              <div>
                <div style={{ color: "#EAEAEA", fontWeight: 500 }}>HIGH</div>
                <div style={{ color: "#A0A0A0", fontSize: 12 }}>Risk Level</div>
              </div>
              <div style={{ color: "#C24B4B", fontSize: 24, fontWeight: 600 }}>{riskDistribution.HIGH}</div>
            </div>
            <div
              style={{
                padding: 16,
                backgroundColor: "#181818",
                borderRadius: 6,
                border: "1px solid #E5E7EB",
                marginTop: 8,
              }}
            >
              <div style={{ color: "#A0A0A0", fontSize: 12, marginBottom: 4 }}>Trend</div>
              <div style={{ color: "#EAEAEA", fontSize: 14, fontWeight: 500 }}>{riskDistribution.trend}</div>
            </div>
          </div>
        </div>

        {/* 4️⃣ Evidence Integrity */}
        <div
          style={{
            padding: 24,
                  backgroundColor: "#FFFFFF",
            borderRadius: 8,
            border: "1px solid #E5E7EB",
          }}
        >
          <h3 style={{ margin: "0 0 16px", color: "#EAEAEA", fontSize: 18, fontWeight: 600 }}>
            Evidence Integrity
          </h3>
          <div style={{ padding: 16, backgroundColor: "#181818", borderRadius: 6, border: "1px solid #242424" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
              <div>
                <div style={{ color: "#EAEAEA", fontWeight: 500, marginBottom: 4 }}>Hash Verification</div>
                <div style={{ color: "#A0A0A0", fontSize: 14 }}>
                  {evidenceIntegrity.verified} / {evidenceIntegrity.total} verified
                </div>
              </div>
              <span
                style={{
                  padding: "4px 8px",
                  backgroundColor: "#3FA36C",
                  color: "#0A0A0A",
                  borderRadius: 4,
                  fontSize: 11,
                  fontWeight: 600,
                }}
              >
                {evidenceIntegrity.status.replace(/_/g, " ")}
              </span>
            </div>
            <div style={{ paddingTop: 12, borderTop: "1px solid #242424" }}>
              <div style={{ color: "#A0A0A0", fontSize: 12, marginBottom: 4 }}>Audit Completeness</div>
              <div style={{ color: "#EAEAEA", fontSize: 14 }}>100% - All intents have complete audit trails</div>
            </div>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
