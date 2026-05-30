/**
 * hooks/usePublishers.js
 *
 * React Query hooks for all publisher operations.
 */
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { publishersApi } from "@/api/publishers";
import { useAuth }       from "@/hooks/useAuth";
import { hasPerm }       from "@/utils/permissions";

const toArray = (data) => (Array.isArray(data) ? data : (data?.results ?? []));

// ── Query keys ────────────────────────────────────────────────────────────────
export const publisherKeys = {
  all:     ()         => ["publishers"],
  list:    (filters)  => ["publishers", "list", filters],
  detail:  (id)       => ["publishers", "detail", id],
  my:      (filters)  => ["publishers", "my", filters],
  choices: ()         => ["publishers", "choices"],
};

// ── List ──────────────────────────────────────────────────────────────────────
export function usePublishers(filters = {}) {
  const { user, isLoading } = useAuth();
  return useQuery({
    queryKey: ["publishers", "list", user?.id, filters],
    queryFn:  () => publishersApi.list(filters).then((r) => r.data),
    enabled:  !isLoading && !!user && !!user.id && hasPerm(user, "publishers"),
    retry:    false,
  });
}

// ── My publishers (Sales team) ────────────────────────────────────────────────
export function useMyPublishers(filters = {}) {
  const { user, isLoading } = useAuth();
  return useQuery({
    queryKey: ["publishers", "my", user?.id, filters],
    queryFn:  () => publishersApi.my(filters).then((r) => toArray(r.data)),
    enabled:  !isLoading && !!user && !!user.id && hasPerm(user, "publishers"),
    retry:    false,
  });
}

// ── Single publisher ──────────────────────────────────────────────────────────
export function usePublisher(id) {
  const { user, isLoading } = useAuth();
  return useQuery({
    queryKey: publisherKeys.detail(id),
    queryFn:  () => publishersApi.get(id).then((r) => r.data),
    enabled:  !isLoading && !!id && id !== "undefined" && !!user && !!user.id && hasPerm(user, "publishers"),
    retry:    false,
    staleTime: 0,
  });
}

// ── Form choices ──────────────────────────────────────────────────────────────
export function usePublisherChoices() {
  const { user, isLoading } = useAuth();
  return useQuery({
    queryKey: ["publishers", "choices", user?.id],
    queryFn:  () => publishersApi.choices().then((r) => r.data),
    enabled:  !isLoading && !!user && !!user.id && hasPerm(user, "publishers"),
    retry:    false,
    staleTime: 10 * 60 * 1000,
  });
}

// ── Create ────────────────────────────────────────────────────────────────────
export function useCreatePublisher() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data) => publishersApi.create(data).then((r) => r.data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: publisherKeys.all() });
    },
  });
}

// ── Update ────────────────────────────────────────────────────────────────────
export function useUpdatePublisher() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }) => publishersApi.update(id, data).then((r) => r.data),
    onSuccess: (_, { id }) => {
      qc.invalidateQueries({ queryKey: publisherKeys.detail(id) });
      qc.invalidateQueries({ queryKey: publisherKeys.all() });
    },
  });
}

// ── Delete ────────────────────────────────────────────────────────────────────
export function useDeletePublisher() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id) => publishersApi.delete(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: publisherKeys.all() });
    },
  });
}

// ── Status change ─────────────────────────────────────────────────────────────
export function useSetPublisherStatus() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, status }) => publishersApi.setStatus(id, status).then((r) => r.data),
    onSuccess: (_, { id }) => {
      qc.invalidateQueries({ queryKey: publisherKeys.detail(id) });
      qc.invalidateQueries({ queryKey: publisherKeys.all() });
    },
  });
}

// ── Approve (MIS Approver) ────────────────────────────────────────────────────
export function useApprovePublisher() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id) => publishersApi.approve(id).then((r) => r.data),
    onSuccess: (_, id) => {
      qc.invalidateQueries({ queryKey: publisherKeys.detail(id) });
      qc.invalidateQueries({ queryKey: publisherKeys.all() });
    },
  });
}

// ── Reject (MIS Approver) ─────────────────────────────────────────────────────
export function useRejectPublisher() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, rejection_note }) =>
      publishersApi.reject(id, rejection_note).then((r) => r.data),
    onSuccess: (_, { id }) => {
      qc.invalidateQueries({ queryKey: publisherKeys.detail(id) });
      qc.invalidateQueries({ queryKey: publisherKeys.all() });
    },
  });
}

// ── Manage managers ───────────────────────────────────────────────────────────
export function useManagePublisherManagers(publisherId) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (managerIds) =>
      publishersApi.manageManagers(publisherId, managerIds).then((r) => r.data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: publisherKeys.detail(publisherId) });
      qc.invalidateQueries({ queryKey: publisherKeys.all() });
    },
  });
}

// ── Eligible managers (admin / mis_approver only) ─────────────────────────────
export function useEligiblePublisherManagers() {
  const { user, isLoading } = useAuth();
  return useQuery({
    queryKey: ["publishers", "eligible-managers"],
    queryFn:  () => publishersApi.eligibleManagers().then((r) => r.data),
    enabled:  !isLoading && !!user && !!user.id &&
              (user.role === "admin" || user.is_mis_approver === true),
    retry:    false,
    staleTime: 60_000,
  });
}
