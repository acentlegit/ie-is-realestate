import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import Login from "../screens/Login";
import Dashboard from "../screens/Dashboard";
import Intent from "../screens/Intent";
import IntentLivingSpace from "../screens/IntentLivingSpace";
import { isAuthenticated } from "../auth/keycloakAuth";

function PrivateRoute({ children }) {
  return isAuthenticated() ? children : <Navigate to="/" />;
}

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route 
          path="/" 
          element={isAuthenticated() ? <Navigate to="/intent" replace /> : <Login />} 
        />
        <Route
          path="/dashboard"
          element={
            <PrivateRoute>
              <Dashboard />
            </PrivateRoute>
          }
        />
        <Route
          path="/intent"
          element={
            <PrivateRoute>
              <Intent />
            </PrivateRoute>
          }
        />
        <Route
          path="/living-space"
          element={
            <PrivateRoute>
              <IntentLivingSpace />
            </PrivateRoute>
          }
        />
      </Routes>
    </BrowserRouter>
  );
}
