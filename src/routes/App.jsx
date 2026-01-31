import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import Login from "../screens/Login";
import Dashboard from "../screens/Dashboard";
import Intent from "../screens/Intent";
import IntentLivingSpace from "../screens/IntentLivingSpace";
import { isAuthenticated, getRole } from "../auth/keycloakAuth";

function PrivateRoute({ children }) {
  return isAuthenticated() ? children : <Navigate to="/" />;
}

/** After login: agent/admin go to dashboard, others to intent. */
function AuthRedirect() {
  const role = getRole();
  if (role === "agent" || role === "admin" || role === "superuser") {
    return <Navigate to="/dashboard" replace />;
  }
  return <Navigate to="/intent" replace />;
}

/** Buyer/seller/property_owner see Intent; agent/admin redirected to dashboard (same layout, agent content). */
function IntentRoute({ children }) {
  const role = getRole();
  if (role === "agent" || role === "admin" || role === "superuser") {
    return <Navigate to="/dashboard" replace />;
  }
  return children;
}

export default function App() {
  return (
    <BrowserRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
      <Routes>
        {/* Login: agent/admin → dashboard, others → intent */}
        <Route
          path="/"
          element={isAuthenticated() ? <AuthRedirect /> : <Login />}
        />
        {/* Dashboard = full-screen role dashboard, no app sidebar (all roles) */}
        <Route
          path="/dashboard"
          element={
            <PrivateRoute>
              <Dashboard />
            </PrivateRoute>
          }
        />
        {/* Intent flow: full-screen (Sessions | Content | Journey) for all roles, no app sidebar */}
        <Route
          path="/intent"
          element={
            <PrivateRoute>
              <IntentRoute>
                <Intent />
              </IntentRoute>
            </PrivateRoute>
          }
        />
        <Route
          path="/living-space"
          element={
            <PrivateRoute>
              <IntentRoute>
                <IntentLivingSpace />
              </IntentRoute>
            </PrivateRoute>
          }
        />
      </Routes>
    </BrowserRouter>
  );
}
