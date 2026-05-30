/**
 * api/notifications.js
 *
 * All notification API calls.
 * Components never call this directly — use hooks/useNotifications.js
 */
import api from "./axios";

export const notificationsApi = {
  /** GET /api/notifications/?unread_only=true */
  list: (params = {}) =>
    api.get("/notifications/", { params }),

  /** GET /api/notifications/unread-count/ */
  unreadCount: () =>
    api.get("/notifications/unread-count/"),

  /** POST /api/notifications/{id}/read/ */
  markRead: (id) =>
    api.post(`/notifications/${id}/read/`),

  /** POST /api/notifications/read-all/ */
  markAllRead: () =>
    api.post("/notifications/read-all/"),
};