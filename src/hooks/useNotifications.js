/**
 * hooks/useNotifications.js
 *
 * React Query hooks for notifications.
 *
 * Polling strategy:
 *   - unreadCount polls every 30s — keeps bell badge live
 *   - list fetches on demand — opened when bell is clicked
 */
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { notificationsApi } from "@/api/notifications";

const toArray = (data) => Array.isArray(data) ? data : (data?.results ?? []);

// ── Query keys ────────────────────────────────────────────────────────────────
export const notifKeys = {
  all:         ()       => ["notifications"],
  list:        (params) => ["notifications", "list", params],
  unreadCount: ()       => ["notifications", "unread-count"],
};

// ── Unread count — polls every 30s for live badge ─────────────────────────────
export function useUnreadCount() {
  return useQuery({
    queryKey:           notifKeys.unreadCount(),
    queryFn:            () => notificationsApi.unreadCount().then((r) => r.data.unread_count ?? 0),
    refetchInterval:    30_000,   // poll every 30 seconds
    staleTime:          10_000,
    refetchOnWindowFocus: true,
  });
}

// ── Notification list ─────────────────────────────────────────────────────────
export function useNotifications(params = {}) {
  return useQuery({
    queryKey: notifKeys.list(params),
    queryFn:  () => notificationsApi.list(params).then((r) => toArray(r.data)),
    staleTime: 0,
  });
}

// ── Mark one as read ──────────────────────────────────────────────────────────
export function useMarkRead() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id) => notificationsApi.markRead(id).then((r) => r.data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: notifKeys.all() });
    },
  });
}

// ── Mark all as read ──────────────────────────────────────────────────────────
export function useMarkAllRead() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: () => notificationsApi.markAllRead().then((r) => r.data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: notifKeys.all() });
    },
  });
}