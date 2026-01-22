import { useNavigate, useLocation } from "react-router-dom";
import { getRole } from "../auth/keycloakAuth";

/**
 * LEFT NAVIGATION — Role-Aware, Minimal (Layered Dark Mode)
 * 
 * Purpose: Navigation only, no data entry, no business logic
 * 
 * Role Navigation:
 * - Buyer: Intent, My History, My Evidence
 * - Seller: Intent, My Properties, History, Evidence
 * - Agent: Assigned Intents, Actions, History, Evidence
 * - Admin: All Intents, Compliance, Policies, Evidence, System
 */
export default function Sidebar() {
  const role = getRole();
  const navigate = useNavigate();
  const location = useLocation();

  const isActive = (path) => location.pathname === path;
  const isBuyer = role === "buyer";
  const isSeller = role === "seller";
  const isAgent = role === "agent";
  const isAdmin = role === "admin" || role === "superuser";

  const navItemStyle = (active) => ({
    padding: "12px 20px",
    cursor: "pointer",
    backgroundColor: active ? "#F1F3F5" : "transparent",
    borderLeft: active ? "3px solid #111827" : "3px solid transparent",
    fontWeight: active ? 600 : 400,
    color: active ? "#111827" : "#4B5563",
    fontSize: 14,
  });

  return (
    <div
      style={{
        width: 240,
        background: "#FAFBFC",
        borderRight: "1px solid #E5E7EB",
        padding: 0,
        height: "100vh",
        display: "flex",
        flexDirection: "column",
      }}
    >
      {/* UIP Logo */}
      <div
        style={{
          padding: "20px",
          borderBottom: "1px solid #E5E7EB",
          display: "flex",
          alignItems: "center",
          gap: 10,
        }}
      >
        <div
          style={{
            fontSize: 24,
            fontWeight: 700,
            color: "#111827",
            letterSpacing: -0.5,
          }}
        >
          UIP
        </div>
      </div>

      {/* Navigation Menu */}
      <nav style={{ flex: 1, padding: "16px 0" }}>
        <ul style={{ listStyle: "none", padding: 0, margin: 0 }}>
          {/* Intent - Default landing (ALL ROLES) */}
          <li
            style={navItemStyle(isActive("/intent"))}
            onClick={() => navigate("/intent")}
          >
            🧭 Intent
          </li>

          {/* Buyer Navigation */}
          {isBuyer && (
            <>
              <li
                style={{
                  ...navItemStyle(isActive("/history")),
                  cursor: "not-allowed",
                  opacity: 0.5,
                }}
              >
                🕘 My History
              </li>
              <li
                style={{
                  ...navItemStyle(isActive("/evidence")),
                  cursor: "not-allowed",
                  opacity: 0.5,
                }}
              >
                🔗 My Evidence
              </li>
            </>
          )}

          {/* Seller Navigation */}
          {isSeller && (
            <>
              <li
                style={{
                  ...navItemStyle(isActive("/properties")),
                  cursor: "not-allowed",
                  opacity: 0.5,
                }}
              >
                🏠 My Properties
              </li>
              <li
                style={{
                  ...navItemStyle(isActive("/history")),
                  cursor: "not-allowed",
                  opacity: 0.5,
                }}
              >
                🕘 History
              </li>
              <li
                style={{
                  ...navItemStyle(isActive("/evidence")),
                  cursor: "not-allowed",
                  opacity: 0.5,
                }}
              >
                🔗 Evidence
              </li>
            </>
          )}

          {/* Agent Navigation */}
          {isAgent && (
            <>
              <li
                style={navItemStyle(isActive("/dashboard"))}
                onClick={() => navigate("/dashboard")}
              >
                🧑‍💼 Assigned Intents
              </li>
              <li
                style={{
                  ...navItemStyle(isActive("/actions")),
                  cursor: "not-allowed",
                  opacity: 0.5,
                }}
              >
                ⚙️ Actions
              </li>
              <li
                style={{
                  ...navItemStyle(isActive("/history")),
                  cursor: "not-allowed",
                  opacity: 0.5,
                }}
              >
                🕘 History
              </li>
              <li
                style={{
                  ...navItemStyle(isActive("/evidence")),
                  cursor: "not-allowed",
                  opacity: 0.5,
                }}
              >
                🔗 Evidence
              </li>
            </>
          )}

          {/* Admin Navigation */}
          {isAdmin && (
            <>
              <li
                style={navItemStyle(isActive("/dashboard"))}
                onClick={() => navigate("/dashboard")}
              >
                🧭 All Intents
              </li>
              <li
                style={{
                  ...navItemStyle(isActive("/compliance")),
                  cursor: "not-allowed",
                  opacity: 0.5,
                }}
              >
                🛡️ Compliance
              </li>
              <li
                style={{
                  ...navItemStyle(isActive("/policies")),
                  cursor: "not-allowed",
                  opacity: 0.5,
                }}
              >
                📜 Policies
              </li>
              <li
                style={{
                  ...navItemStyle(isActive("/evidence")),
                  cursor: "not-allowed",
                  opacity: 0.5,
                }}
              >
                🔗 Evidence
              </li>
              <li
                style={{
                  ...navItemStyle(isActive("/system")),
                  cursor: "not-allowed",
                  opacity: 0.5,
                }}
              >
                ⚙️ System
              </li>
            </>
          )}
        </ul>
      </nav>

      {/* User Role Badge (bottom) */}
      <div
        style={{
          padding: "16px 20px",
          borderTop: "1px solid #E5E7EB",
          fontSize: 12,
          color: "#6B7280",
        }}
      >
        Role: <strong style={{ color: "#111827" }}>{role?.toUpperCase() || "USER"}</strong>
      </div>
    </div>
  );
}

