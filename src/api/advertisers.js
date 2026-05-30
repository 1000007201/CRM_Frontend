/**
 * api/advertisers.js
 *
 * All Advertiser API calls.
 * Components never call this directly — use hooks/useAdvertisers.js
 */
import api from "./axios";

export const advertisersApi = {
  /** GET /api/advertisers/?type=agency&status=active&... */
  list: (params = {}) =>
    api.get("/advertisers/", { params }),

  /** GET /api/advertisers/{id}/ */
  get: (id) => api.get(`/advertisers/${id}/`),

  /** POST /api/advertisers/ */
  create: (data) => api.post("/advertisers/", data),

  /** PATCH /api/advertisers/{id}/ */
  update: (id, data) => api.patch(`/advertisers/${id}/`, data),

  /** DELETE /api/advertisers/{id}/ */
  delete: (id) => api.delete(`/advertisers/${id}/`),

  /** GET /api/advertisers/my/ — advertisers assigned to current user */
  my: (params = {}) =>
    api.get("/advertisers/my/", { params }),

  /** GET /api/advertisers/choices/ — dropdown options for form */
  choices: () => api.get("/advertisers/choices/"),

  /** GET /api/advertisers/stats/ — counts per status, independent of filters */
  stats: (params = {}) => api.get("/advertisers/stats/", { params }),

  /** PATCH /api/advertisers/{id}/status/ — quick status change */
  setStatus: (id, status) =>
    api.patch(`/advertisers/${id}/status/`, { status }),

  /** POST /api/advertisers/{id}/approve-as-new/ — approve pending with optional field edits */
  approveAsNew: (id, edits = {}) =>
    api.post(`/advertisers/${id}/approve-as-new/`, { edits }),

  /** POST /api/advertisers/{id}/map-to-existing/ — merge pending into existing approved */
  mapToExisting: (id, targetAdvertiserId) =>
    api.post(`/advertisers/${id}/map-to-existing/`, { target_advertiser_id: targetAdvertiserId }),

  /** POST /api/advertisers/{id}/reject/ — reject pending with reason */
  reject: (id, reason) =>
    api.post(`/advertisers/${id}/reject/`, { reason }),

  /** POST /api/advertisers/{id}/revert-to-pending/ — revert approved back to pending */
  revertToPending: (id, reason) =>
    api.post(`/advertisers/${id}/revert-to-pending/`, { reason }),

  /** POST /api/advertisers/{id}/manage-managers/ */
  manageManagers: (id, data) =>
    api.post(`/advertisers/${id}/manage-managers/`, data),

  /** GET /api/advertisers/{id}/manager-contacts/ — managers + their contact counts */
  managerContacts: (id) =>
    api.get(`/advertisers/${id}/manager-contacts/`),

  /** GET /api/advertisers/eligible-managers/ — users with advertisers permission */
  eligibleManagers: () =>
    api.get("/advertisers/eligible-managers/"),

  /** POST /api/advertisers/{id}/unmerge/ — undo a map-to-existing merge */
  unmerge: (id) => api.post(`/advertisers/${id}/unmerge/`),

  /** GET /api/advertisers/export/?file_format=csv|xlsx&... — download file */
  export: (format, params = {}) => {
    const queryParams = new URLSearchParams({ file_format: format, ...params }).toString();
    return api.get(`/advertisers/export/?${queryParams}`, { responseType: "blob" });
  },
};