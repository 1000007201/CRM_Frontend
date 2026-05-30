/**
 * api/leads.js
 */
import api from "./axios";

export const leadsApi = {
  /** GET /api/leads/?stage=new&priority=high&... */
  list: (params = {}) =>
    api.get("/leads/", { params }),

  /** GET /api/leads/{id}/ */
  get: (id) => api.get(`/leads/${id}/`),

  /** POST /api/leads/ */
  create: (data) => api.post("/leads/", data),

  /** PATCH /api/leads/{id}/ */
  update: (id, data) => api.patch(`/leads/${id}/`, data),

  /** DELETE /api/leads/{id}/ */
  delete: (id) => api.delete(`/leads/${id}/`),

  // ── Stage ──────────────────────────────────────────────────────────────

  /** PATCH /api/leads/{id}/stage/ */
  changeStage: (id, stage) =>
    api.patch(`/leads/${id}/stage/`, { stage }),

  // ── Assignment ─────────────────────────────────────────────────────────

  /** POST /api/leads/{id}/assign/ */
  assign: (id, assignedTo, note = "", taskAction = "keep_all", taskIds = []) =>
    api.post(`/leads/${id}/assign/`, {
      assigned_to: assignedTo,
      note,
      task_action: taskAction,
      task_ids:    taskIds,
    }),

  /** GET /api/leads/{id}/pending-tasks/ — called before reassign modal */
  pendingTasks: (id) =>
    api.get(`/leads/${id}/pending-tasks/`),

  /** GET /api/leads/{id}/assignment-history/ */
  assignmentHistory: (id) =>
    api.get(`/leads/${id}/assignment-history/`),

  // ── Notes ──────────────────────────────────────────────────────────────

  /** GET /api/leads/{id}/notes/ */
  getNotes: (id) => api.get(`/leads/${id}/notes/`),

  /** POST /api/leads/{id}/notes/ */
  addNote: (id, content) =>
    api.post(`/leads/${id}/notes/`, { content }),

  // ── Activity ───────────────────────────────────────────────────────────

  /** GET /api/leads/{id}/activity/ */
  getActivity: (id) => api.get(`/leads/${id}/activity/`),

  // ── Special views ──────────────────────────────────────────────────────

  /** GET /api/leads/pipeline/ */
  pipeline: (params = {}) =>
    api.get("/leads/pipeline/", { params }),

  /** GET /api/leads/my/ */
  myLeads: (params = {}) =>
    api.get("/leads/my/", { params }),

  /** GET /api/leads/?search=<query>&page_size=<n> — autocomplete search */
  search: (query, limit = 10) =>
    api.get("/leads/", { params: { search: query, page_size: limit } }),

  /** GET /api/leads/stats/?assigned_to=<uuid> */
  stats: (assignedTo = null) =>
    api.get("/leads/stats/", {
      params: assignedTo ? { assigned_to: assignedTo } : {},
    }),

  // ── Bulk upload ────────────────────────────────────────────────────────

  /**
   * POST /api/leads/bulk-upload/preview/
   * Sends file as multipart/form-data.
   * Returns preview data without writing any Lead rows.
   */
  bulkPreview: (file) => {
    const formData = new FormData();
    formData.append("file", file);
    return api.post("/leads/bulk-upload/preview/", formData, {
      headers: { "Content-Type": "multipart/form-data" },
    });
  },

  /**
   * POST /api/leads/bulk-upload/confirm/
   * Body: { import_id: "<uuid>" }
   * Creates Lead rows from the previewed data.
   */
  bulkConfirm: (importId) =>
    api.post("/leads/bulk-upload/confirm/", { import_id: importId }),

  /**
   * GET /api/leads/bulk-upload/history/
   * Lists past import logs for this admin.
   */
  bulkHistory: () =>
    api.get("/leads/bulk-upload/history/"),

  /**
   * GET /api/leads/bulk-upload/template/
   * Downloads the Excel template with auth.
   */
  bulkTemplate: () =>
    api.get("/leads/bulk-upload/template/", { responseType: "blob" }),
};