import { getRole } from "../auth/keycloakAuth";
import BuyerDashboard from "../dashboards/BuyerDashboard";
import SellerDashboard from "../dashboards/SellerDashboard";
import AgentDashboard from "../dashboards/AgentDashboard";
import AdminDashboard from "../dashboards/AdminDashboard";

/**
 * Role-based dashboard routing. Roles come from Keycloak realm roles:
 * buyer, seller, agent, property_owner, admin, superuser
 */
export default function RoleRouter() {
  const role = getRole();

  switch (role) {
    case "buyer":
      return <BuyerDashboard />;
    case "seller":
      return <SellerDashboard />;
    case "agent":
      return <AgentDashboard />;
    case "property_owner":
      return <SellerDashboard />; // Property owner uses seller-style dashboard
    case "admin":
    case "superuser":
      return <AdminDashboard />;
    default:
      return (
        <div style={{ padding: 40, textAlign: "center", color: "#A0A0A0" }}>
          Unauthorized - No dashboard available for role: {role ?? "none"}. Assign a realm role in Keycloak (buyer, seller, agent, property_owner, admin, superuser).
        </div>
      );
  }
}

