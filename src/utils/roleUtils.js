/**
 * Role-Based Access Control Utilities
 * Uses Keycloak roles to determine access
 */

import keycloak from "../auth/keycloakAuth";

/**
 * Get user roles from Keycloak token
 */
export function getUserRoles() {
  if (!keycloak || !keycloak.tokenParsed) {
    return [];
  }

  // Keycloak roles can be in different places:
  // 1. realm_access.roles (realm roles)
  // 2. resource_access[client-id].roles (client roles)
  // 3. roles (if directly in token)
  
  const roles = [];
  
  // Realm roles
  if (keycloak.tokenParsed.realm_access?.roles) {
    roles.push(...keycloak.tokenParsed.realm_access.roles);
  }
  
  // Client roles (for the current client)
  const clientId = keycloak.clientId;
  if (keycloak.tokenParsed.resource_access?.[clientId]?.roles) {
    roles.push(...keycloak.tokenParsed.resource_access[clientId].roles);
  }
  
  // Direct roles
  if (keycloak.tokenParsed.roles) {
    roles.push(...keycloak.tokenParsed.roles);
  }
  
  return [...new Set(roles)]; // Remove duplicates
}

/**
 * Check if user has a specific role
 */
export function hasRole(role) {
  const roles = getUserRoles();
  return roles.some(r => r.toLowerCase() === role.toLowerCase());
}

/**
 * Get user's primary role (Buyer, Agent, Admin)
 */
export function getPrimaryRole() {
  const roles = getUserRoles();
  
  // Check in priority order
  if (roles.some(r => r.toLowerCase().includes("admin") || r.toLowerCase().includes("practitioner"))) {
    return "admin";
  }
  if (roles.some(r => r.toLowerCase().includes("agent"))) {
    return "agent";
  }
  if (roles.some(r => r.toLowerCase().includes("buyer"))) {
    return "buyer";
  }
  
  // Default to buyer if no role found
  return "buyer";
}

/**
 * Get available sessions based on user role
 */
export function getAvailableSessions() {
  const role = getPrimaryRole();
  const allSessions = [
    { key: "buyer", label: "Buyer", icon: "👤" },
    { key: "agent", label: "Agent", icon: "🏢" },
    { key: "lender", label: "Lender", icon: "💰" },
    { key: "property", label: "Property", icon: "🏠" },
    { key: "legal", label: "Legal", icon: "⚖️" },
  ];

  // Admin/Practitioner: Access to all sessions
  if (role === "admin") {
    return allSessions;
  }

  // Agent: Access to Agent, Property, Legal
  if (role === "agent") {
    return allSessions.filter(s => 
      ["agent", "property", "legal"].includes(s.key)
    );
  }

  // Buyer: Buyer and Property only (no Agent session card – agent flow is separate when logged in as agent)
  if (role === "buyer") {
    return allSessions.filter(s => 
      ["buyer", "property"].includes(s.key)
    );
  }

  // Default: Only buyer session
  return allSessions.filter(s => s.key === "buyer");
}

/**
 * Check if user can access a specific session
 */
export function canAccessSession(sessionKey) {
  const availableSessions = getAvailableSessions();
  return availableSessions.some(s => s.key === sessionKey);
}
