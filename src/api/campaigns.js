/**
 * api/campaigns.js
 *
 * All Campaign API calls.
 * Components never call this directly — use hooks/useCampaigns.js
 */
import api from "./axios";

export const campaignsApi = {
  /** GET /api/campaigns/?campaign_type=affiliate&status=active&... */
  list: (params = {}) =>
    api.get("/campaigns/", { params }),

  /** GET /api/campaigns/{id}/ */
  get: (id) => api.get(`/campaigns/${id}/`),

  /** POST /api/campaigns/ */
  create: (data) => api.post("/campaigns/", data),

  /** PATCH /api/campaigns/{id}/ */
  update: (id, data) => api.patch(`/campaigns/${id}/`, data),

  /** POST /api/campaigns/{id}/approve/ */
  approve: (id, data) => api.post(`/campaigns/${id}/approve/`, data),

  /** POST /api/campaigns/{id}/reject/ */
  reject: (id, data) => api.post(`/campaigns/${id}/reject/`, data),

  // ── Publishers ────────────────────────────────────────────────────────────────

  /** GET /api/campaigns/{id}/publishers/ */
  getPublishers: (id) => api.get(`/campaigns/${id}/publishers/`),

  /** POST /api/campaigns/{id}/publishers/ */
  assignPublisher: (id, data) => api.post(`/campaigns/${id}/publishers/`, data),

  /** DELETE /api/campaigns/{id}/publishers/{pubId}/ */
  removePublisher: (id, pubId) => api.delete(`/campaigns/${id}/publishers/${pubId}/`),

  // ── Creatives ─────────────────────────────────────────────────────────────────

  /** GET /api/campaigns/{id}/creatives/ */
  getCreatives: (id) => api.get(`/campaigns/${id}/creatives/`),

  /** POST /api/campaigns/{id}/creatives/ (multipart/form-data) */
  uploadCreative: (id, formData) =>
    api.post(`/campaigns/${id}/creatives/`, formData, {
      headers: { "Content-Type": "multipart/form-data" },
    }),

  /** DELETE /api/campaigns/{id}/creatives/{fileId}/ */
  removeCreative: (id, fileId) => api.delete(`/campaigns/${id}/creatives/${fileId}/`),

  // ── CCN autocomplete ──────────────────────────────────────────────────────────

  /** GET /api/campaigns/ccn/?search=... */
  ccnList: (params = {}) => api.get("/ccns/", { params }),

  // ── Bulk upload ───────────────────────────────────────────────────────────────

  /** POST /api/campaigns/bulk-upload-preview/ (multipart/form-data) */
  bulkUploadPreview: (file) => {
    const fd = new FormData();
    fd.append("file", file);
    return api.post("/campaigns/bulk-upload-preview/", fd, {
      headers: { "Content-Type": "multipart/form-data" },
    });
  },

  /** POST /api/campaigns/bulk-upload/ (multipart/form-data) */
  bulkUploadConfirm: (file) => {
    const fd = new FormData();
    fd.append("file", file);
    return api.post("/campaigns/bulk-upload/", fd, {
      headers: { "Content-Type": "multipart/form-data" },
    });
  },

  /** GET /api/campaigns/upload-template/ */
  downloadTemplate: () => api.get("/campaigns/upload-template/", { responseType: "blob" }),
};
