import { logout, getRole } from "../auth/keycloakAuth";
import { useNavigate } from "react-router-dom";
import keycloak from "../auth/keycloakAuth";

/**
 * TOP BAR (Global - Dark Mode)
 * 
 * Purpose: Expression, not navigation
 * Components: User Avatar only (right side)
 * Intent input is in Intent screen, not here
 */
export default function Topbar() {
  const navigate = useNavigate();
  const role = getRole();
  const tokenParsed = keycloak.tokenParsed;
  const userName = tokenParsed?.preferred_username || tokenParsed?.name || "User";

  return (
    <div
      style={{
        height: 50,
        borderBottom: "1px solid #E5E7EB",
        display: "flex",
        justifyContent: "flex-end",
        alignItems: "center",
        padding: "0 24px",
        background: "#FAFBFC",
      }}
    >
      {/* Right side - User Avatar only */}
      <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
        {/* User Avatar - Enterprise Style */}
        <div
          style={{
            width: 32,
            height: 32,
            borderRadius: "50%",
            backgroundColor: "#111827",
            color: "#FFFFFF",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontSize: 14,
            fontWeight: 600,
            cursor: "pointer",
          }}
          onClick={() => {
            logout();
            navigate("/");
          }}
          title={`${userName} (${role?.toUpperCase() || "USER"}) - Click to logout`}
        >
          {userName.charAt(0).toUpperCase()}
        </div>
      </div>
    </div>
  );
}

