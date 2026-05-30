/**
 * hooks/useTasks.js
 *
 * React Query hooks for all task operations.
 *
 * Data normalisation:
 *   All list endpoints return plain arrays (backend has pagination_class=None
 *   on my/, upcoming/, overdue/ endpoints).
 *   The main /tasks/ list is paginated — useTasks() returns raw paginated data
 *   so the Tasks page can read count/pages.
 *   All other list hooks use toArray() to always return a plain array.
 */
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { tasksApi } from "@/api/tasks";
import { useAuth }  from "@/hooks/useAuth";
import { hasPerm }  from "@/utils/permissions";

// DRF may return { count, results } or a plain array
const toArray = (data) => (Array.isArray(data) ? data : (data?.results ?? []));

// ── Query keys ─────────────────────────────────────────────────────────────────
export const taskKeys = {
  all:      ()         => ["tasks"],
  list:     (params)   => ["tasks", "list", params],
  detail:   (id)       => ["tasks", "detail", id],
  my:       (params)   => ["tasks", "my", params],
  upcoming: ()         => ["tasks", "upcoming"],
  overdue:  ()         => ["tasks", "overdue"],
  team:     (params)   => ["tasks", "team", params],
  forLead:  (leadId)   => ["tasks", "lead", leadId],
};

// ── List (paginated — Tasks page) ──────────────────────────────────────────────
export function useTasks(params = {}) {
  const { user, isLoading } = useAuth();
  return useQuery({
    queryKey: ["tasks", "list", user?.id, params],
    queryFn:  () => tasksApi.list(params).then((r) => r.data),
    enabled:  !isLoading && !!user && !!user.id && hasPerm(user, "sales_crm"),
    retry:    false,
  });
}

// ── Single task detail ─────────────────────────────────────────────────────────
export function useTask(id) {
  const { user, isLoading } = useAuth();
  return useQuery({
    queryKey: taskKeys.detail(id),
    queryFn:  () => tasksApi.get(id).then((r) => r.data),
    enabled:  !isLoading && !!id && id !== "undefined" && !!user && !!user.id && hasPerm(user, "sales_crm"),
    retry:    false,
  });
}

// ── My tasks (plain array, no pagination) ──────────────────────────────────────
export function useMyTasks(params = {}) {
  const { user, isLoading } = useAuth();
  return useQuery({
    queryKey: ["tasks", "my", user?.id, params],
    queryFn:  () => tasksApi.my(params).then((r) => toArray(r.data)),
    enabled:  !isLoading && !!user && !!user.id && hasPerm(user, "sales_crm"),
    retry:    false,
  });
}

// ── Upcoming tasks — due in next 7 days ────────────────────────────────────────
export function useUpcomingTasks() {
  const { user, isLoading } = useAuth();
  return useQuery({
    queryKey: ["tasks", "upcoming", user?.id],
    queryFn:  () => tasksApi.upcoming().then((r) => toArray(r.data)),
    enabled:  !isLoading && !!user && !!user.id && hasPerm(user, "sales_crm"),
    retry:    false,
    refetchInterval: 60_000,
  });
}

// ── Overdue tasks ──────────────────────────────────────────────────────────────
export function useOverdueTasks() {
  const { user, isLoading } = useAuth();
  return useQuery({
    queryKey: ["tasks", "overdue", user?.id],
    queryFn:  () => tasksApi.overdue().then((r) => toArray(r.data)),
    enabled:  !isLoading && !!user && !!user.id && hasPerm(user, "sales_crm"),
    retry:    false,
    refetchInterval: 60_000,
  });
}

// ── Team tasks (manager/admin) ─────────────────────────────────────────────────
export function useTeamTasks(params = {}) {
  const { user, isLoading } = useAuth();
  return useQuery({
    queryKey: ["tasks", "team", user?.id, params],
    queryFn:  () => tasksApi.team(params).then((r) => toArray(r.data)),
    enabled:  !isLoading && !!user && !!user.id && hasPerm(user, "sales_crm"),
    retry:    false,
  });
}

// ── Tasks linked to a lead ─────────────────────────────────────────────────────
export function useLeadTasks(leadId, params = {}) {
  const { user, isLoading } = useAuth();
  return useQuery({
    queryKey: [...taskKeys.forLead(leadId), params],
    queryFn:  () => tasksApi.forLead(leadId, params).then((r) => toArray(r.data)),
    enabled:  !isLoading && !!leadId && leadId !== "undefined" && !!user && !!user.id && hasPerm(user, "sales_crm"),
    retry:    false,
  });
}

// ── Create task ────────────────────────────────────────────────────────────────
export function useCreateTask() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data) => tasksApi.create(data).then((r) => r.data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: taskKeys.all() });
      qc.invalidateQueries({ queryKey: ["leads"] });
      qc.invalidateQueries({ queryKey: ["activity"] });
    },
  });
}

// ── Create task linked to a lead ──────────────────────────────────────────────
export function useCreateLeadTask(leadId) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data) => tasksApi.createForLead(leadId, data).then((r) => r.data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: taskKeys.all() });
      qc.invalidateQueries({ queryKey: taskKeys.forLead(leadId) });
    },
  });
}

// ── Update task ────────────────────────────────────────────────────────────────
export function useUpdateTask() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }) => tasksApi.update(id, data).then((r) => r.data),
    onSuccess: (_, { id }) => {
      qc.invalidateQueries({ queryKey: taskKeys.all() });
      qc.invalidateQueries({ queryKey: taskKeys.detail(id) });
      qc.invalidateQueries({ queryKey: ["leads"] });
      qc.invalidateQueries({ queryKey: ["activity"] });
    },
  });
}

// ── Delete task ────────────────────────────────────────────────────────────────
export function useDeleteTask() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id) => tasksApi.delete(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: taskKeys.all() });
    },
  });
}

// ── Toggle complete / reopen ───────────────────────────────────────────────────
export function useToggleTaskComplete() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id) => tasksApi.toggleComplete(id).then((r) => r.data),
    onSuccess: (data) => {
      qc.invalidateQueries({ queryKey: taskKeys.all() });
      if (data?.id) {
        qc.setQueryData(taskKeys.detail(data.id), data);
      }
      if (data?.lead) {
        qc.invalidateQueries({ queryKey: taskKeys.forLead(data.lead) });
      }
    },
  });
}
