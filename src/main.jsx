import React from "react";
import ReactDOM from "react-dom/client";
import App from "./routes/App";
import { initKeycloak } from "./auth/keycloakAuth";
// Living Space UI - Dark theme (imported last to override light-mode)
import "./styles/living-space.css";

console.log("Starting Keycloak initialization...");

initKeycloak()
  .then((authenticated) => {
    console.log("Auth initialized, authenticated:", authenticated);
    // Always render app (mock auth always returns true, Keycloak handles redirects)
    ReactDOM.createRoot(document.getElementById("root")).render(
      <React.StrictMode>
        <App />
      </React.StrictMode>
    );
  })
  .catch((error) => {
    console.error("Auth initialization error:", error);
    // Even on error, try to render with mock auth
    console.warn("Rendering app anyway - may use mock auth");
    ReactDOM.createRoot(document.getElementById("root")).render(
      <React.StrictMode>
        <App />
      </React.StrictMode>
    );
  });
