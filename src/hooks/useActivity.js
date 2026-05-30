/**
 * hooks/useActivity.js
 */
import { useQuery, keepPreviousData } from "@tanstack/react-query";
import { activityApi } from "@/api/activity";
import { useAuth }     from "@/hooks/useAuth";
import { hasPerm }     from "@/utils/permissions";

// DRF paginates list views as { count, results: [...] }
const toArray = (data) => (Array.isArray(data) ? data : (data?.results ?? []));

export const activityKeys = {
  all:     ()       => ["activity"],
  list:    (params) => ["activity", "list", params],
  lead:    (id)     => ["activity", "lead", id],
  mine:    ()       => ["activity", "mine"],
  summary: ()       => ["activity", "summary"],
  recent:  (limit)  => ["activity", "recent", limit],
};

export function useActivitySummary() {
  const { user, isLoading } = useAuth();
  return useQuery({
    queryKey: ["activity", "summary", user?.id],
    queryFn:  () => activityApi.summary().then((r) => r.data),
    enabled:  !isLoading && !!user && !!user.id && hasPerm(user, "sales_crm"),
    retry:    false,
  });
}

export function useRecentActivity(limit = 20) {
  const { user, isLoading } = useAuth();
  return useQuery({
    queryKey: ["activity", "recent", user?.id, limit],
    queryFn:  () => activityApi.recent(limit).then((r) => toArray(r.data)),
    enabled:  !isLoading && !!user && !!user.id && hasPerm(user, "sales_crm"),
    retry:    false,
    refetchInterval: 30_000,
  });
}

export function useLeadActivity(leadId) {
  const { user, isLoading } = useAuth();
  return useQuery({
    queryKey: activityKeys.lead(leadId),
    queryFn:  () => activityApi.forLead(leadId).then((r) => toArray(r.data)),
    enabled:  !isLoading && !!leadId && !!user && !!user.id && hasPerm(user, "sales_crm"),
    retry:    false,
  });
}

export function useActivityList(params = {}) {
  const { user, isLoading } = useAuth();
  return useQuery({
    queryKey:        ["activity", "list", user?.id, params],
    queryFn:         () => activityApi.list(params).then((r) => r.data),
    enabled:         !isLoading && !!user && !!user.id && hasPerm(user, "sales_crm"),
    retry:           false,
    placeholderData: keepPreviousData,
  });
}

export function useActivity(filters = {}) {
  const { user, isLoading } = useAuth();
  return useQuery({
    queryKey: ["activity", "list", user?.id, filters],
    queryFn:  () => activityApi.list(filters).then((r) => r.data),
    enabled:  !isLoading && !!user && !!user.id,
    retry:    false,
    staleTime: 30_000,
  });
}

/**
 * useUserActivity — activity for a specific user (for "View As" dashboard feature).
 * Uses the list endpoint with actor filter.
 */
export function useUserActivity(userId, limit = 15) {
  const { user, isLoading } = useAuth();
  return useQuery({
    queryKey: ["activity", "user", user?.id, userId, limit],
    queryFn:  () =>
      activityApi.list({ actor: userId, page_size: limit })
        .then((r) => toArray(r.data)),
    enabled:  !isLoading && !!userId && !!user && !!user.id && hasPerm(user, "sales_crm"),
    retry:    false,
  });
}
