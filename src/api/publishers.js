/**
 * api/publishers.js
 *
 * All Publisher API calls.
 * Components never call this directly — use hooks/usePublishers.js
 */
import api from "./axios";

export const publishersApi = {
  /** GET /api/publishers/?status=active&region=asia&... */
  list: (params = {}) =>
    api.get("/publishers/", { params }),

  /** GET /api/publishers/{id}/ */
  get: (id) => api.get(`/publishers/${id}/`),

  /** POST /api/publishers/ */
  create: (data) => api.post("/publishers/", data),

  /** PATCH /api/publishers/{id}/ */
  update: (id, data) => api.patch(`/publishers/${id}/`, data),

  /** DELETE /api/publishers/{id}/ */
  delete: (id) => api.delete(`/publishers/${id}/`),

  /** GET /api/publishers/my/ — publishers assigned to current user */
  my: (params = {}) =>
    api.get("/publishers/my/", { params }),

  /** GET /api/publishers/choices/ — dropdown + multiselect options */
  choices: () => api.get("/publishers/choices/"),

  /** PATCH /api/publishers/{id}/status/ — quick status change */
  setStatus: (id, status) =>
    api.patch(`/publishers/${id}/status/`, { status }),

  /** POST /api/publishers/{id}/approve/ — MIS Approver approves publisher */
  approve: (id) => api.post(`/publishers/${id}/approve/`),

  /** POST /api/publishers/{id}/reject/ — MIS Approver rejects with reason */
  reject: (id, rejection_note) =>
    api.post(`/publishers/${id}/reject/`, { rejection_note }),

  /** POST /api/publishers/{id}/manage-managers/ — set manager list */
  manageManagers: (id, managerIds) =>
    api.post(`/publishers/${id}/manage-managers/`, { manager_ids: managerIds }),

  /** GET /api/publishers/eligible-managers/ — users eligible as publisher managers */
  eligibleManagers: () => api.get("/publishers/eligible-managers/"),
};