/**
 * api/axios.js
 *
 * Axios instance with two interceptors:
 *
 * REQUEST interceptor
 *   Attaches the current access token to every outgoing request header.
 *   If the access token is expired and a refresh token exists,
 *   it proactively refreshes before sending the request.
 *
 * RESPONSE interceptor
 *   Catches 401 responses, attempts one token refresh, then retries
 *   the original request with the new access token.
 *   If the refresh also fails → clears tokens + redirects to /login.
 */
import axios from "axios";
import {
  getAccessToken,
  getRefreshToken,
  saveTokens,
  clearTokens,
  isTokenExpired,
  getAdminAccessToken,
  getAdminRefreshToken,
} from "@/utils/token";

// ── Base instance ─────────────────────────────────────────────────────────────

const api = axios.create({
  baseURL: `${import.meta.env.VITE_API_BASE_URL}/api`,          // Vite proxy forwards to http://localhost:8000/api
  headers: { "Content-Type": "application/json" },
  timeout: 15_000,
});

// ── Refresh lock ──────────────────────────────────────────────────────────────
// Prevents multiple simultaneous calls from each triggering their own refresh.

let isRefreshing    = false;
let refreshQueue    = [];   // callbacks waiting for the new token

const processQueue  = (error, token = null) => {
  refreshQueue.forEach((cb) => (error ? cb.reject(error) : cb.resolve(token)));
  refreshQueue = [];
};

// ── Shared refresh function ───────────────────────────────────────────────────

const refreshAccessToken = async () => {
  const refresh = getRefreshToken();
  if (!refresh) throw new Error("No refresh token available.");

  // Use a plain axios call (not the `api` instance) to avoid interceptor loops
  const { data } = await axios.post("/api/auth/token/refresh/", { refresh });
  saveTokens({ access: data.access, refresh: data.refresh ?? refresh });
  return data.access;
};

// ── REQUEST interceptor ───────────────────────────────────────────────────────
// Modify Requests to add the Authorization header with the access token, and
// proactively refresh if the access token is expired before sending.

api.interceptors.request.use(
  async (config) => {
    let token = getAccessToken();

    // Proactively refresh if expired before even sending
    if (token && isTokenExpired(token)) {
      const refresh = getRefreshToken();
      if (refresh && !isTokenExpired(refresh)) {
        try {
          token = await refreshAccessToken();
        } catch {
          clearTokens();
          window.location.href = "/login";
          return Promise.reject(new Error("Session expired."));
        }
      } else {
        clearTokens();
        window.location.href = "/login";
        return Promise.reject(new Error("Session expired."));
      }
    }

    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }

    return config;
  },
  (error) => Promise.reject(error),
);

// ── RESPONSE interceptor ──────────────────────────────────────────────────────

api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const original = error.config;

    // Only handle 401 errors that haven't already been retried
    if (error.response?.status !== 401 || original._retry) {
      return Promise.reject(error);
    }

    // Skip retry for the login and token-refresh endpoints themselves
    if (
      original.url?.includes("/auth/login/") ||
      original.url?.includes("/auth/token/refresh/")
    ) {
      return Promise.reject(error);
    }

    if (isRefreshing) {
      // Another request is already refreshing — queue this one
      return new Promise((resolve, reject) => {
        refreshQueue.push({
          resolve: (token) => {
            original.headers.Authorization = `Bearer ${token}`;
            resolve(api(original));
          },
          reject,
        });
      });
    }

    original._retry = true;
    isRefreshing    = true;

    try {
      const newToken = await refreshAccessToken();
      processQueue(null, newToken);
      original.headers.Authorization = `Bearer ${newToken}`;
      return api(original);
    } catch (refreshError) {
      processQueue(refreshError, null);

      // If the impersonated user's refresh token expired but the admin
      // session still exists, restore the admin session instead of
      // forcing a full logout.
      const adminAccess  = getAdminAccessToken();
      const adminRefresh = getAdminRefreshToken();
      if (adminAccess && adminRefresh) {
        saveTokens({ access: adminAccess, refresh: adminRefresh });
        // Full reload — hydrate() will restore admin user from token
        window.location.href = "/dashboard";
        return Promise.reject(refreshError);
      }

      clearTokens();
      window.location.href = "/login";
      return Promise.reject(refreshError);
    } finally {
      isRefreshing = false;
    }
  },
);

export default api;