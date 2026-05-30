/**
 * api/assignments.js
 */
import api from "./axios";

export const assignmentsApi = {
  /** POST /api/assignments/leads/{leadId}/assign/ */
  assign: (leadId, assignedTo, note = "") =>
    api.post(`/assignments/leads/${leadId}/assign/`, {
      assigned_to: assignedTo,
      note,
    }),

  /** GET /api/assignments/leads/{leadId}/history/ */
  history: (leadId) =>
    api.get(`/assignments/leads/${leadId}/history/`),

  /** POST /api/assignments/bulk-assign/ */
  bulkAssign: (leadIds, assignedTo, note = "") =>
    api.post("/assignments/bulk-assign/", {
      lead_ids:    leadIds,
      assigned_to: assignedTo,
      note,
    }),

  /** GET /api/assignments/unassigned/ */
  unassigned: () => api.get("/assignments/unassigned/"),

  /** GET /api/assignments/workload/ */
  workload: () => api.get("/assignments/workload/"),

  /** GET /api/assignments/mine/ */
  mine: () => api.get("/assignments/mine/"),
};