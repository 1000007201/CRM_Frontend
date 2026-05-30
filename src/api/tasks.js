/**
 * api/tasks.js
 *
 * All task-related API calls.
 * Every function returns the raw Axios promise —
 * React Query hooks in useTasks.js unwrap the response.
 *
 * Endpoints:
 *   GET    /api/tasks/               List tasks (role-filtered + date-filtered)
 *   POST   /api/tasks/               Create task
 *   GET    /api/tasks/{id}/          Task detail
 *   PATCH  /api/tasks/{id}/          Edit task
 *   DELETE /api/tasks/{id}/          Delete task
 *   PATCH  /api/tasks/{id}/complete/ Toggle complete / reopen
 *   GET    /api/tasks/my/            My assigned tasks
 *   GET    /api/tasks/upcoming/      Due in next 7 days
 *   GET    /api/tasks/overdue/       Past due, still pending
 *   GET    /api/tasks/team/          Manager/Admin — full team tasks
 *   GET    /api/leads/{id}/tasks/    Tasks linked to a specific lead
 *   POST   /api/leads/{id}/tasks/    Create task linked to a lead
 */
import api from "./axios";

export const tasksApi = {

  // ── List + Create ─────────────────────────────────────────────────────────

  /** GET /api/tasks/ — role-filtered list with optional date/status filters
   *
   * Supported params:
   *   status, priority, assigned_to, lead,
   *   due_date, due_date_after, due_date_before,
   *   overdue (true/false), search
   */
  list: (params = {}) =>
    api.get("/tasks/", { params }),

  /** POST /api/tasks/ — create a standalone task */
  create: (data) =>
    api.post("/tasks/", data),

  // ── Single task ───────────────────────────────────────────────────────────

  /** GET /api/tasks/{id}/ — full task detail */
  get: (id) =>
    api.get(`/tasks/${id}/`),

  /** PATCH /api/tasks/{id}/ — edit task fields */
  update: (id, data) =>
    api.patch(`/tasks/${id}/`, data),

  /** DELETE /api/tasks/{id}/ */
  delete: (id) =>
    api.delete(`/tasks/${id}/`),

  /** PATCH /api/tasks/{id}/complete/ — toggle complete ↔ pending */
  toggleComplete: (id) =>
    api.patch(`/tasks/${id}/complete/`),

  // ── Filtered lists ────────────────────────────────────────────────────────

  /** GET /api/tasks/my/ — tasks assigned to the current user */
  my: (params = {}) =>
    api.get("/tasks/my/", { params }),

  /** GET /api/tasks/upcoming/ — due in next 7 days, pending/in_progress */
  upcoming: () =>
    api.get("/tasks/upcoming/"),

  /** GET /api/tasks/overdue/ — past due, still pending/in_progress */
  overdue: () =>
    api.get("/tasks/overdue/"),

  /** GET /api/tasks/team/ — manager/admin: full team task list */
  team: (params = {}) =>
    api.get("/tasks/team/", { params }),

  // ── Lead-linked tasks ─────────────────────────────────────────────────────

  /** GET /api/leads/{leadId}/tasks/ — tasks linked to a specific lead */
  forLead: (leadId, params = {}) =>
    api.get(`/leads/${leadId}/tasks/`, { params }),

  /** POST /api/leads/{leadId}/tasks/ — create task linked to a lead */
  createForLead: (leadId, data) =>
    api.post(`/leads/${leadId}/tasks/`, data),
};