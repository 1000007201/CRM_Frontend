/**
 * api/activity.js
 */
import api from "./axios";

export const activityApi = {
  /** GET /api/activity/?action=stage_changed&... */
  list: (params = {}) => api.get("/activity/", { params }),

  /** GET /api/activity/lead/{leadId}/ */
  forLead: (leadId) => api.get(`/activity/lead/${leadId}/`),

  /** GET /api/activity/my/ */
  mine: () => api.get("/activity/my/"),

  /** GET /api/activity/summary/ */
  summary: () => api.get("/activity/summary/"),

  /** GET /api/activity/recent/?limit=20 */
  recent: (limit = 20) =>
    api.get("/activity/recent/", { params: { limit } }),
};