// Mock Keycloak for development when Keycloak is not available
// This provides the same interface as keycloakAuth.js

const mockKeycloak = {
  token: 'mock-dev-token',
  tokenParsed: {
    name: 'Developer',
    preferred_username: 'dev',
    realm_access: { 
      roles: ['buyer', 'seller', 'agent'] 
    }
  },
  init: () => Promise.resolve(true),
  login: () => {
    console.log('[Mock Auth] Login called');
  },
  logout: () => {
    console.log('[Mock Auth] Logout called');
    localStorage.removeItem('role');
  },
  updateToken: () => Promise.resolve(true)
};

export const initKeycloak = () => {
  console.log('[Mock Auth] Initializing mock authentication...');
  return Promise.resolve(true);
};

export const login = () => {
  console.log('[Mock Auth] Login called');
  localStorage.setItem('role', 'buyer');
};

export const logout = () => {
  console.log('[Mock Auth] Logout called');
  localStorage.removeItem('role');
};

export const isAuthenticated = () => {
  return true; // Always authenticated in mock mode
};

export const getRole = () => {
  const roles = mockKeycloak.tokenParsed.realm_access.roles;
  if (roles.includes('buyer')) return 'buyer';
  if (roles.includes('seller')) return 'seller';
  if (roles.includes('agent')) return 'agent';
  return 'buyer'; // Default
};

export const getToken = async () => {
  return Promise.resolve('mock-dev-token');
};

export default mockKeycloak;

