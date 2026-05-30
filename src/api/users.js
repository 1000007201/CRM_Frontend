/**
 * api/users.js
 */
import axios from "axios";
import api from "./axios";
import { getAdminAccessToken, getAccessToken } from "@/utils/token";

const BASE_URL = "/api";

export const usersApi = {
  /** GET /api/auth/users/ — admin: all users, optional ?role=sales_employee */
  list: (params = {}) =>
    api.get("/auth/users/", { params }),

  /** GET /api/auth/users/{id}/ */
  get: (id) => api.get(`/auth/users/${id}/`),

  /** POST /api/auth/users/ — admin creates a new user */
  create: (data) => api.post("/auth/users/", data),

  /** PATCH /api/auth/users/{id}/ */
  update: (id, data) => api.patch(`/auth/users/${id}/`, data),

  /** GET /api/auth/users/managers/ — list of all managers (for dropdowns) */
  managers: () => api.get("/auth/users/managers/"),

  /** GET /api/auth/users/team/ — current manager's team members */
  team: () => api.get("/auth/users/team/"),

  /** GET /api/auth/users/sales-staff/ — all sales managers + members (for dropdowns) */
  salesStaff: () => api.get("/auth/users/sales-staff/"),

  /** POST /api/auth/users/{id}/impersonate/
   *  Always uses admin token so it works even when currently viewing as another user */
  impersonate: (userId) => {
    const adminToken = getAdminAccessToken() || getAccessToken();
    return axios.post(
      `${BASE_URL}/auth/users/${userId}/impersonate/`,
      {},
      { headers: { Authorization: `Bearer ${adminToken}` } }
    );
  },

  /** GET /api/auth/users/{id}/permissions/ */
  getPermissions: (userId) =>
    api.get(`/auth/users/${userId}/permissions/`),

  /** POST /api/auth/users/{id}/permissions/ */
  setPermissions: (userId, permissions) =>
    api.post(`/auth/users/${userId}/permissions/`, { permissions }),

  /** GET /api/auth/users/pending-count/ — number of inactive (pending) users */
  pendingCount: () => api.get("/auth/users/pending-count/"),

  /** DELETE /api/auth/users/{id}/ — admin removes a user */
  delete: (id) => api.delete(`/auth/users/${id}/`),

  /** GET /api/auth/users/switcher-list/
   *  Always uses admin token so list persists even when viewing as another user */
  switcherList: () => {
    const adminToken = getAdminAccessToken() || getAccessToken();
    return axios.get(
      `${BASE_URL}/auth/users/switcher-list/`,
      { headers: { Authorization: `Bearer ${adminToken}` } }
    );
  },
};