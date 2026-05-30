/**
 * context/AuthContext.jsx
 *
 * Provides:
 *   user        — { id, email, full_name, role } | null
 *   isLoading   — true while checking stored token on first load
 *   login(email, password) → Promise
 *   logout()
 *
 * On mount:
 *   1. Reads access token from localStorage
 *   2. If valid + not expired → restores user from token payload
 *   3. If expired → attempts silent refresh using the stored refresh token
 *   4. If refresh fails → clears tokens, user = null
 *
 * Components never touch localStorage or tokens directly —
 * everything goes through this context.
 */
import { createContext, useContext, useEffect, useReducer, useCallback } from "react";
import { useNavigate }    from "react-router-dom";
import { useQueryClient } from "@tanstack/react-query";
import { authApi }  from "@/api/auth";
import { usersApi } from "@/api/users";
import { hasPerm }  from "@/utils/permissions";
import {
  saveTokens,
  clearTokens,
  getAccessToken,
  getRefreshToken,
  getUserFromToken,
  isTokenExpired,
  setAdminTokens,
  clearAdminTokens,
  getAdminAccessToken,
  getAdminRefreshToken,
  isImpersonating,
} from "@/utils/token";

// ── State shape ───────────────────────────────────────────────────────────────

const initialState = {
  user:      null,
  isLoading: true,   // true during initial token hydration
};

function authReducer(state, action) {
  switch (action.type) {
    case "SET_USER":
      return { ...state, user: action.payload, isLoading: false };
    case "CLEAR_USER":
      return { ...state, user: null, isLoading: false };
    case "SET_LOADING":
      return { ...state, isLoading: action.payload };
    default:
      return state;
  }
}

// ── Context ───────────────────────────────────────────────────────────────────

const AuthContext = createContext(null);

// ── Helper: first accessible route for a given user ──────────────────────────

function getHomePathForUser(user) {
  if (!user) return "/login";
  if (user.role === "admin" || hasPerm(user, "sales_crm")) return "/dashboard";
  if (hasPerm(user, "advertisers")) return "/advertisers";
  if (hasPerm(user, "publishers"))  return "/publishers";
  if (hasPerm(user, "campaigns"))   return "/campaigns";
  if (hasPerm(user, "tags"))        return "/tags";
  if (hasPerm(user, "users"))       return "/users";
  return "/dashboard";
}

// ── Provider ──────────────────────────────────────────────────────────────────

export function AuthProvider({ children }) {
  const [state, dispatch] = useReducer(authReducer, initialState);
  const navigate     = useNavigate();
  const queryClient  = useQueryClient();

  // ── Hydrate on first mount ──────────────────────────────────────────────
  useEffect(() => {
    const hydrate = async () => {
      const accessToken  = getAccessToken();
      const refreshToken = getRefreshToken();

      // No tokens stored — not logged in
      if (!accessToken && !refreshToken) {
        dispatch({ type: "CLEAR_USER" });
        return;
      }

      // Access token still valid — restore user from its payload
      if (accessToken && !isTokenExpired(accessToken)) {
        try {
          const { data: user } = await authApi.me();
          if (user) {
            // Kill any subscriptions that mounted before user was known
            queryClient.clear();
            dispatch({ type: "SET_USER", payload: user });

            // Admin token validation — keep exactly as it is now, no changes
            const adminToken = getAdminAccessToken();
            if (adminToken) {
              if (isTokenExpired(adminToken)) {
                clearAdminTokens();
                clearTokens();
                dispatch({ type: "CLEAR_USER" });
                return;
              }
              const adminUser = getUserFromToken(adminToken);
              if (!adminUser || adminUser.role !== "admin") {
                clearAdminTokens();
                clearTokens();
                dispatch({ type: "CLEAR_USER" });
                return;
              }
            }

            return;
          }
        } catch {
          // /me/ call failed — fall through to silent refresh attempt below
        }
      }

      // Access token expired — try silent refresh
      if (refreshToken && !isTokenExpired(refreshToken)) {
        try {
          const { data } = await authApi.refreshToken(refreshToken);
          saveTokens({ access: data.access, refresh: data.refresh ?? refreshToken });
          const user = getUserFromToken(data.access);
          queryClient.clear();
          dispatch({ type: "SET_USER", payload: user });
          return;
        } catch {
          // Refresh failed — treat as logged out
        }
      }

      // All attempts failed
      clearTokens();
      dispatch({ type: "CLEAR_USER" });
    };

    hydrate();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ── Login ───────────────────────────────────────────────────────────────
  const login = useCallback(async (email, password) => {
    const { data } = await authApi.login(email, password);

    // Backend returns { access, refresh, user: { ... } }
    saveTokens({ access: data.access, refresh: data.refresh });

    // Prefer the full user object from the response body (has phone etc.)
    // Fall back to token decode if not present
    const user = data.user ?? getUserFromToken(data.access);

    // Persist admin tokens separately so they survive user switching
    if (user?.role === "admin") {
      setAdminTokens(data.access, data.refresh);
    }

    // Kill stale subscriptions before the new user's components subscribe
    queryClient.clear();
    dispatch({ type: "SET_USER", payload: user });

    return user;
  }, [queryClient]);

  // ── Logout ──────────────────────────────────────────────────────────────
  const logout = useCallback(async () => {
    const refresh = getRefreshToken();
    try {
      if (refresh) await authApi.logout(refresh);
    } catch {
      // Even if the API call fails, clear local state
    } finally {
      clearTokens();
      clearAdminTokens();
      queryClient.clear();   // prevent stale data from leaking into next session
      dispatch({ type: "CLEAR_USER" });
    }
  }, [queryClient]);

  // ── Update user in context (e.g. after profile edit) ────────────────────
  const setUser = useCallback((userData) => {
    dispatch({ type: "SET_USER", payload: userData });
  }, []);

  // ── Switch to another user (admin impersonation) ─────────────────────────
  const switchToUser = useCallback(async (userId) => {
    // Back-to-admin: restore original tokens and clear impersonation flag
    if (isImpersonating()) {
      const adminToken = getAdminAccessToken();
      const adminUser  = getUserFromToken(adminToken);
      if (adminUser?.id === userId) {
        const adminRefresh = getAdminRefreshToken();
        saveTokens({ access: adminToken, refresh: adminRefresh });
        clearAdminTokens();
        queryClient.clear();
        window.location.href = getHomePathForUser(adminUser);
        return;
      }
    }

    const res = await usersApi.impersonate(userId);
    const { access, refresh, user: targetUser } = res.data;

    // Save tokens first so the hydration on the new page picks them up
    saveTokens({ access, refresh });
    queryClient.clear();   // clear cache before reload (belt-and-suspenders)
    dispatch({ type: "SET_USER", payload: targetUser });

    // Hard reload — clears all stale React Query cache and component state,
    // guaranteeing the new user sees only their accessible data.
    window.location.href = getHomePathForUser(targetUser);
  }, [queryClient]);

  const value = {
    user:           state.user,
    isLoading:      state.isLoading,
    login,
    logout,
    setUser,
    switchToUser,
    isImpersonating,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}

// ── Hook ──────────────────────────────────────────────────────────────────────

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error("useAuth must be used inside <AuthProvider>");
  }
  return ctx;
}
