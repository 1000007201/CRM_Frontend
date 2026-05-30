/**
 * api/tags.js
 *
 * All Tag API calls.
 * Components never call this directly — use hooks/useTags.js
 */
import api from "./axios";

export const tagsApi = {
  /** GET /api/leads/tags/?search=... */
  list:       (params = {}) => api.get("/leads/tags/", { params }),

  /** GET /api/leads/tags/{id}/ */
  get:        (id)           => api.get(`/leads/tags/${id}/`),

  /** POST /api/leads/tags/ */
  create:     (data)         => api.post("/leads/tags/", data),

  /** PATCH /api/leads/tags/{id}/ */
  update:     (id, data)     => api.patch(`/leads/tags/${id}/`, data),

  /** DELETE /api/leads/tags/{id}/ */
  delete:     (id)           => api.delete(`/leads/tags/${id}/`),

  /** POST /api/leads/tags/{id}/rename/ */
  rename:     (id, name)     => api.post(`/leads/tags/${id}/rename/`, { name }),

  /** POST /api/leads/tags/{id}/merge-into/ — merge this tag into target */
  mergeInto:  (id, targetId) => api.post(`/leads/tags/${id}/merge-into/`, { target_id: targetId }),
};
