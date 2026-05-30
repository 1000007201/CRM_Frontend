/**
 * hooks/useCampaigns.js
 *
 * React Query hooks for all campaign operations.
 * Components call these hooks — never campaignsApi directly.
 */
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { campaignsApi } from "@/api/campaigns";
import { useAuth }      from "@/hooks/useAuth";
import { hasPerm }      from "@/utils/permissions";

const toArray = (data) => (Array.isArray(data) ? data : (data?.results ?? []));

// ── Query keys ────────────────────────────────────────────────────────────────
export const campaignKeys = {
  all:        ()         => ["campaigns"],
  list:       (filters)  => ["campaigns", "list", filters],
  detail:     (id)       => ["campaigns", "detail", id],
  publishers: (id)       => ["campaigns", "publishers", id],
  creatives:  (id)       => ["campaigns", "creatives", id],
  ccn:        (search)   => ["campaigns", "ccn", search],
};

// ── List ──────────────────────────────────────────────────────────────────────
export function useCampaigns(filters = {}) {
  const { user, isLoading } = useAuth();
  return useQuery({
    queryKey: ["campaigns", "list", user?.id, filters],
    queryFn:  () => campaignsApi.list(filters).then((r) => r.data),
    enabled:  !isLoading && !!user && !!user.id && hasPerm(user, "campaigns"),
    retry:    false,
  });
}

// ── Single campaign ───────────────────────────────────────────────────────────
export function useCampaign(id) {
  const { user, isLoading } = useAuth();
  return useQuery({
    queryKey:  campaignKeys.detail(id),
    queryFn:   () => campaignsApi.get(id).then((r) => r.data),
    enabled:   !isLoading && !!id && id !== "undefined" && !!user && !!user.id && hasPerm(user, "campaigns"),
    retry:     false,
    staleTime: 0,
  });
}

// ── Create ────────────────────────────────────────────────────────────────────
export function useCreateCampaign() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data) => campaignsApi.create(data).then((r) => r.data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: campaignKeys.all() });
    },
  });
}

// ── Update ────────────────────────────────────────────────────────────────────
export function useUpdateCampaign(id) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data) => campaignsApi.update(id, data).then((r) => r.data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: campaignKeys.detail(id) });
      qc.invalidateQueries({ queryKey: campaignKeys.all() });
    },
  });
}

// ── Approve ───────────────────────────────────────────────────────────────────
export function useApproveCampaign(id) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data) => campaignsApi.approve(id, data).then((r) => r.data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: campaignKeys.detail(id) });
      qc.invalidateQueries({ queryKey: campaignKeys.all() });
    },
  });
}

// ── Reject ────────────────────────────────────────────────────────────────────
export function useRejectCampaign(id) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data) => campaignsApi.reject(id, data).then((r) => r.data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: campaignKeys.detail(id) });
      qc.invalidateQueries({ queryKey: campaignKeys.all() });
    },
  });
}

// ── Publishers ────────────────────────────────────────────────────────────────
export function useCampaignPublishers(id) {
  const { user, isLoading } = useAuth();
  return useQuery({
    queryKey: campaignKeys.publishers(id),
    queryFn:  () => campaignsApi.getPublishers(id).then((r) => toArray(r.data)),
    enabled:  !isLoading && !!id && id !== "undefined" && !!user && !!user.id && hasPerm(user, "campaigns"),
    retry:    false,
  });
}

export function useAssignPublisher(id) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data) => campaignsApi.assignPublisher(id, data).then((r) => r.data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: campaignKeys.publishers(id) });
    },
  });
}

export function useRemovePublisher(id) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (pubId) => campaignsApi.removePublisher(id, pubId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: campaignKeys.publishers(id) });
    },
  });
}

// ── Creatives ─────────────────────────────────────────────────────────────────
export function useCampaignCreatives(id) {
  const { user, isLoading } = useAuth();
  return useQuery({
    queryKey: campaignKeys.creatives(id),
    queryFn:  () => campaignsApi.getCreatives(id).then((r) => toArray(r.data)),
    enabled:  !isLoading && !!id && id !== "undefined" && !!user && !!user.id && hasPerm(user, "campaigns"),
    retry:    false,
  });
}

export function useUploadCreative(id) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (formData) => campaignsApi.uploadCreative(id, formData).then((r) => r.data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: campaignKeys.creatives(id) });
    },
  });
}

export function useRemoveCreative(id) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (fileId) => campaignsApi.removeCreative(id, fileId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: campaignKeys.creatives(id) });
    },
  });
}

// ── CCN autocomplete ──────────────────────────────────────────────────────────
export function useCCNList(search = "") {
  const { user, isLoading } = useAuth();
  return useQuery({
    queryKey: ["campaigns", "ccn", user?.id, search],
    queryFn:  () =>
      campaignsApi.ccnList(search ? { search } : {}).then((r) => toArray(r.data)),
    enabled:  !isLoading && !!user && !!user.id && hasPerm(user, "campaigns"),
    retry:    false,
  });
}
