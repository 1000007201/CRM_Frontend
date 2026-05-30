/**
 * utils/token.js
 *
 * All JWT read/write operations live here.
 * The rest of the app never touches localStorage directly.
 */
import { jwtDecode } from "jwt-decode";

const ACCESS_KEY  = "crm_access";
const REFRESH_KEY = "crm_refresh";

// ── Storage ───────────────────────────────────────────────────────────────────

export const saveTokens = ({ access, refresh }) => {
  localStorage.setItem(ACCESS_KEY,  access);
  localStorage.setItem(REFRESH_KEY, refresh);
};

export const getAccessToken  = () => localStorage.getItem(ACCESS_KEY);
export const getRefreshToken = () => localStorage.getItem(REFRESH_KEY);

export const clearTokens = () => {
  localStorage.removeItem(ACCESS_KEY);
  localStorage.removeItem(REFRESH_KEY);
};

// ── Decode ────────────────────────────────────────────────────────────────────

/**
 * Decode the access token and return its payload.
 * Returns null if the token is missing or malformed.
 */
export const decodeToken = (token) => {
  if (!token) return null;
  try {
    return jwtDecode(token);
  } catch {
    return null;
  }
};

/**
 * Returns true if the token's expiry is in the past (or within
 * a 30-second buffer so we refresh before it actually expires).
 */
export const isTokenExpired = (token) => {
  const decoded = decodeToken(token);
  if (!decoded?.exp) return true;
  return decoded.exp * 1000 < Date.now() + 30_000;
};

// ── Admin tokens (impersonation) ──────────────────────────────────────────────
// Saved once on admin login, never overwritten during user switching.

const ADMIN_ACCESS_KEY  = "admin_access_token";
const ADMIN_REFRESH_KEY = "admin_refresh_token";

export const setAdminTokens = (access, refresh) => {
  localStorage.setItem(ADMIN_ACCESS_KEY,  access);
  localStorage.setItem(ADMIN_REFRESH_KEY, refresh);
};

export const getAdminAccessToken  = () => localStorage.getItem(ADMIN_ACCESS_KEY);
export const getAdminRefreshToken = () => localStorage.getItem(ADMIN_REFRESH_KEY);

export const clearAdminTokens = () => {
  localStorage.removeItem(ADMIN_ACCESS_KEY);
  localStorage.removeItem(ADMIN_REFRESH_KEY);
};

// True when the admin is currently viewing as a different user
export const isImpersonating = () => {
  const adminToken   = getAdminAccessToken();
  const currentToken = getAccessToken();
  return !!adminToken && adminToken !== currentToken;
};

// ── Decode ────────────────────────────────────────────────────────────────────

/**
 * Extract the user info baked into the access token by the backend
 * (CustomTokenObtainPairSerializer adds email, full_name, role).
 */
export const getUserFromToken = (token) => {
  const decoded = decodeToken(token);
  if (!decoded) return null;
  return {
    id:              decoded.user_id,
    email:           decoded.email,
    full_name:       decoded.full_name,
    role:            decoded.role,
    department:      decoded.department      ?? "",
    is_mis_approver: decoded.is_mis_approver ?? false,
    can_approve:     decoded.can_approve     ?? false,
  };
};