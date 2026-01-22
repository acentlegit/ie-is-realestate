// Alternative main.jsx that uses mock auth instead of Keycloak
// Rename this to main.jsx (and backup original) to use mock auth

import React from "react";
import ReactDOM from "react-dom/client";
import App from "./routes/App";
// import { initKeycloak } from "./auth/keycloakAuth"; // Comment out Keycloak
import { initKeycloak } from "./auth/mockAuth"; // Use mock auth instead
import "./styles/light-mode.css";

console.log("Starting with MOCK authentication (Keycloak disabled)...");

initKeycloak()
  .then((authenticated) => {
    console.log("Mock auth initialized, authenticated:", authenticated);
    // Always render app in mock mode
    ReactDOM.createRoot(document.getElementById("root")).render(
      <React.StrictMode>
        <App />
      </React.StrictMode>
    );
  })
  .catch((error) => {
    console.error("Mock auth initialization error:", error);
    ReactDOM.createRoot(document.getElementById("root")).render(
      <div style={{ padding: 40 }}>
        <h2>Authentication Error</h2>
        <p><strong>Error:</strong> {error.message}</p>
      </div>
    );
  });
