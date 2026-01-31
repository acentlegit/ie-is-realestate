import Keycloak from "keycloak-js";

// Check if we should use mock auth (set via environment or localStorage)
const USE_MOCK_AUTH = localStorage.getItem('useMockAuth') === 'true' || 
                      import.meta.env.VITE_USE_MOCK_AUTH === 'true';

let keycloak;
let useMock = false;

// Keycloak config from env (build-time for Docker; .env for dev).
// When the app is loaded over HTTPS, default to same origin so auth stays secure (Web Crypto + no "form not secure").
const KEYCLOAK_URL =
  import.meta.env.VITE_KEYCLOAK_URL ||
  (typeof window !== "undefined" && window.location?.protocol === "https:"
    ? window.location.origin
    : "http://localhost:8080");
const KEYCLOAK_REALM = import.meta.env.VITE_KEYCLOAK_REALM || "intent-platform";
const KEYCLOAK_CLIENT_ID = import.meta.env.VITE_KEYCLOAK_CLIENT_ID || "intent-frontend";

if (!USE_MOCK_AUTH) {
  keycloak = new Keycloak({
    url: KEYCLOAK_URL,
    realm: KEYCLOAK_REALM,
    clientId: KEYCLOAK_CLIENT_ID,
  });
}

export const initKeycloak = () => {
  // If mock auth is enabled, use it immediately
  if (USE_MOCK_AUTH) {
    console.log("Using mock authentication (Keycloak disabled)");
    useMock = true;
    return Promise.resolve(true);
  }

  console.log("Initializing Keycloak...");
  
  return keycloak.init({
    onLoad: "check-sso",
    pkceMethod: "S256",
    checkLoginIframe: false,
    checkLoginIframeInterval: 5,
  }).then((authenticated) => {
    console.log("Keycloak init resolved, authenticated:", authenticated);
    if (!authenticated) {
      console.log("Not authenticated - redirecting to Keycloak login");
      // Redirect to login page
      keycloak.login({
        redirectUri: window.location.origin + window.location.pathname
      });
      // Return false immediately since we're redirecting
      return false;
    }
    return authenticated;
  }).catch((error) => {
    console.error("Keycloak initialization error:", error);
    console.warn("Keycloak not available - falling back to mock auth");
    
    // Fallback to mock auth if Keycloak fails
    useMock = true;
    localStorage.setItem('useMockAuth', 'true');
    return Promise.resolve(true); // Continue with mock auth
  });
};

export const login = () => {
  if (useMock || USE_MOCK_AUTH) {
    console.log("[Mock Auth] Login called");
    return;
  }
  return keycloak.login();
};

export const logout = () => {
  if (useMock || USE_MOCK_AUTH) {
    console.log("[Mock Auth] Logout called");
    localStorage.removeItem('useMockAuth');
    return;
  }
  return keycloak.logout();
};

export const isAuthenticated = () => {
  if (useMock || USE_MOCK_AUTH) {
    return true; // Always authenticated in mock mode
  }
  return !!keycloak.token;
};

/**
 * Role resolution order: admin/superuser first, then agent, seller, property_owner, buyer.
 * Keycloak realm roles used: buyer, seller, agent, property_owner, admin, superuser
 */
export const getRole = () => {
  if (useMock || USE_MOCK_AUTH) {
    return localStorage.getItem('mockRole') || 'buyer';
  }
  const roles = keycloak.tokenParsed?.realm_access?.roles || [];
  if (roles.includes("admin") || roles.includes("superuser")) return roles.includes("superuser") ? "superuser" : "admin";
  if (roles.includes("agent")) return "agent";
  if (roles.includes("seller")) return "seller";
  if (roles.includes("property_owner") || roles.includes("propertyowner")) return "property_owner";
  if (roles.includes("buyer")) return "buyer";
  return null;
};

export const getToken = async () => {
  if (useMock || USE_MOCK_AUTH) {
    return Promise.resolve('mock-dev-token');
  }
  await keycloak.updateToken(30);
  return keycloak.token;
};

// Export keycloak instance (or mock)
export default keycloak || {
  token: 'mock-token',
  tokenParsed: {
    name: 'Developer',
    preferred_username: 'dev',
    realm_access: { roles: ['buyer'] }
  }
};
