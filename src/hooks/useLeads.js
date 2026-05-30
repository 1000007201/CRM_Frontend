/**
 * hooks/useLeads.js
 *
 * React Query hooks for all lead operations.
 * Components call these hooks — they never call leadsApi directly.
 */
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { leadsApi } from "@/api/leads";
import { useAuth }  from "@/hooks/useAuth";
import { hasPerm }  from "@/utils/permissions";

const toArray = (data) => (Array.isArray(data) ? data : (data?.results ?? []));

// ── Query keys (centralized so invalidations stay in sync) ───────────────────

export const leadKeys = {
  all:      ()          => ["leads"],
  list:     (filters)   => ["leads", "list", filters],
  detail:   (id)        => ["leads", "detail", id],
  pipeline: (filters)   => ["leads", "pipeline", filters],
  stats:    ()          => ["leads", "stats"],
  notes:    (id)        => ["leads", "notes", id],
  activity: (id)        => ["leads", "activity", id],
  history:  (id)        => ["leads", "assignment-history", id],
  my:       (filters)   => ["leads", "my", filters],
};

// ── Leads list ────────────────────────────────────────────────────────────────

export function useLeads(filters = {}) {
  const { user, isLoading } = useAuth();
  return useQuery({
    queryKey: ["leads", "list", user?.id, filters],
    queryFn:  () => leadsApi.list(filters).then((r) => r.data),
    enabled:  !isLoading && !!user && !!user.id && hasPerm(user, "sales_crm"),
    retry:    false,
    staleTime: filters.assigned_to ? 0 : 60_000,
  });
}

// ── Single lead ───────────────────────────────────────────────────────────────

export function useLead(id) {
  const { user, isLoading } = useAuth();
  return useQuery({
    queryKey: leadKeys.detail(id),
    queryFn:  () => leadsApi.get(id).then((r) => r.data),
    enabled:  !isLoading && !!id && id !== "undefined" && !!user && !!user.id && hasPerm(user, "sales_crm"),
    retry:    false,
  });
}

// ── Pipeline (kanban) ─────────────────────────────────────────────────────────

export function usePipeline(filters = {}) {
  const { user, isLoading } = useAuth();
  return useQuery({
    queryKey: ["leads", "pipeline", user?.id, filters],
    queryFn:  () => leadsApi.pipeline(filters).then((r) => r.data),
    enabled:  !isLoading && !!user && !!user.id && hasPerm(user, "sales_crm"),
    retry:    false,
  });
}

// ── Stats ─────────────────────────────────────────────────────────────────────

export function useLeadStats(assignedTo = null) {
  const { user, isLoading } = useAuth();
  return useQuery({
    queryKey: ["leads", "stats", user?.id, assignedTo ?? "default"],
    queryFn:  () => leadsApi.stats(assignedTo).then((r) => r.data),
    enabled:  !isLoading && !!user && !!user.id && hasPerm(user, "sales_crm"),
    retry:    false,
    staleTime: 0,
  });
}

// ── My leads ─────────────────────────────────────────────────────────────────

export function useMyLeads(filters = {}) {
  const { user, isLoading } = useAuth();
  return useQuery({
    queryKey: ["leads", "my", user?.id, filters],
    queryFn:  () => leadsApi.myLeads(filters).then((r) => r.data),
    enabled:  !isLoading && !!user && !!user.id && hasPerm(user, "sales_crm"),
    retry:    false,
  });
}

// ── Notes ─────────────────────────────────────────────────────────────────────

export function useLeadNotes(leadId) {
  const { user, isLoading } = useAuth();
  return useQuery({
    queryKey: leadKeys.notes(leadId),
    queryFn:  () => leadsApi.getNotes(leadId).then((r) => toArray(r.data)),
    enabled:  !isLoading && !!leadId && leadId !== "undefined" && !!user && !!user.id && hasPerm(user, "sales_crm"),
    retry:    false,
  });
}

// ── Activity timeline ─────────────────────────────────────────────────────────

export function useLeadActivity(leadId) {
  const { user, isLoading } = useAuth();
  return useQuery({
    queryKey: leadKeys.activity(leadId),
    queryFn:  () => leadsApi.getActivity(leadId).then((r) => toArray(r.data)),
    enabled:  !isLoading && !!leadId && leadId !== "undefined" && !!user && !!user.id && hasPerm(user, "sales_crm"),
    retry:    false,
  });
}

// ── Assignment history ────────────────────────────────────────────────────────

export function useAssignmentHistory(leadId) {
  const { user, isLoading } = useAuth();
  return useQuery({
    queryKey: leadKeys.history(leadId),
    queryFn:  () => leadsApi.assignmentHistory(leadId).then((r) => toArray(r.data)),
    enabled:  !isLoading && !!leadId && leadId !== "undefined" && !!user && !!user.id && hasPerm(user, "sales_crm"),
    retry:    false,
  });
}

// ── Mutations ─────────────────────────────────────────────────────────────────

export function useCreateLead() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data) => leadsApi.create(data).then((r) => r.data),
    onSuccess:  () => qc.invalidateQueries({ queryKey: leadKeys.all() }),
  });
}

export function useUpdateLead() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }) => leadsApi.update(id, data).then((r) => r.data),
    onSuccess:  (_, { id }) => {
      qc.invalidateQueries({ queryKey: leadKeys.detail(id) });
      qc.invalidateQueries({ queryKey: leadKeys.all() });
    },
  });
}

export function useDeleteLead() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id) => leadsApi.delete(id),
    onSuccess:  () => qc.invalidateQueries({ queryKey: leadKeys.all() }),
  });
}

export function useChangeStage() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, stage }) => leadsApi.changeStage(id, stage).then((r) => r.data),
    onSuccess:  (_, { id }) => {
      qc.invalidateQueries({ queryKey: leadKeys.detail(id) });
      qc.invalidateQueries({ queryKey: leadKeys.all() });
      qc.invalidateQueries({ queryKey: leadKeys.activity(id) });
    },
  });
}

export function useAssignLead() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, assignedTo, note, taskAction = "keep_all", taskIds = [] }) =>
      leadsApi.assign(id, assignedTo, note, taskAction, taskIds).then((r) => r.data),
    onSuccess: (_, { id }) => {
      qc.invalidateQueries({ queryKey: leadKeys.detail(id) });
      qc.invalidateQueries({ queryKey: leadKeys.all() });
      qc.invalidateQueries({ queryKey: leadKeys.history(id) });
      qc.invalidateQueries({ queryKey: leadKeys.activity(id) });
      qc.invalidateQueries({ queryKey: ["tasks"] });
    },
  });
}

export function useLeadPendingTasks(leadId) {
  const { user, isLoading } = useAuth();
  return useQuery({
    queryKey: ["leads", "pending-tasks", leadId],
    queryFn:  () => leadsApi.pendingTasks(leadId).then((r) => r.data),
    enabled:  !isLoading && !!leadId && leadId !== "undefined" && !!user && !!user.id && hasPerm(user, "sales_crm"),
    retry:    false,
  });
}

export function useAddNote() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ leadId, content }) =>
      leadsApi.addNote(leadId, content).then((r) => r.data),
    onSuccess: (_, { leadId }) => {
      qc.invalidateQueries({ queryKey: leadKeys.notes(leadId) });
      qc.invalidateQueries({ queryKey: leadKeys.activity(leadId) });
      qc.invalidateQueries({ queryKey: leadKeys.all() });
    },
  });
}

// ── Bulk Upload hooks ─────────────────────────────────────────────────────────

export function useBulkPreview() {
  return useMutation({
    mutationFn: (file) => leadsApi.bulkPreview(file).then((r) => r.data),
  });
}

export function useBulkConfirm() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (importId) => leadsApi.bulkConfirm(importId).then((r) => r.data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: leadKeys.all() });
      qc.invalidateQueries({ queryKey: ["activity"] });
    },
  });
}

export function useBulkHistory() {
  const { user, isLoading } = useAuth();
  return useQuery({
    queryKey: ["bulk-upload", "history", user?.id],
    queryFn:  () => leadsApi.bulkHistory().then((r) =>
      Array.isArray(r.data) ? r.data : (r.data?.results ?? [])
    ),
    enabled:  !isLoading && !!user && !!user.id && hasPerm(user, "sales_crm"),
    retry:    false,
  });
}
