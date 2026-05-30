/**
 * api/auth.js
 */
import api from "./axios";

export const authApi = {
  /** POST /api/auth/login/ */
  login: (email, password) =>
    api.post("/auth/login/", { email, password }),

  /** POST /api/auth/token/refresh/ */
  refreshToken: (refresh) =>
    api.post("/auth/token/refresh/", { refresh }),

  /** POST /api/auth/logout/ — blacklists the refresh token */
  logout: (refreshToken) =>
    api.post("/auth/logout/", { refresh: refreshToken }),

  /** GET /api/auth/me/ — current user profile */
  me: () => api.get("/auth/me/"),

  /** PATCH /api/auth/me/ — update own profile */
  updateMe: (data) => api.patch("/auth/me/", data),

  /** PUT /api/auth/change-password/ */
  changePassword: (data) => api.put("/auth/change-password/", data),

  /** POST /api/auth/users/signup/ — public signup, creates inactive account */
  signup: (data) => api.post("/auth/users/signup/", data),
};