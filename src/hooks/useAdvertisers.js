/**
 * hooks/useAdvertisers.js
 *
 * React Query hooks for all advertiser operations.
 * Components call these hooks — never advertisersApi directly.
 */
import { useState }                              from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { advertisersApi } from "@/api/advertisers";
import { useAuth }        from "@/hooks/useAuth";
import { hasPerm }        from "@/utils/permissions";

const toArray = (data) => (Array.isArray(data) ? data : (data?.results ?? []));

// ── Query keys ────────────────────────────────────────────────────────────────
export const advertiserKeys = {
  all:     ()         => ["advertisers"],
  list:    (filters)  => ["advertisers", "list", filters],
  detail:  (id)       => ["advertisers", "detail", id],
  my:      (filters)  => ["advertisers", "my", filters],
  choices: ()         => ["advertisers", "choices"],
};

// ── Stats ─────────────────────────────────────────────────────────────────────
export function useAdvertiserStats(dateParams = {}) {
  const { user, isLoading } = useAuth();
  return useQuery({
    queryKey: ["advertisers", "stats", user?.id, dateParams],
    queryFn:  () => advertisersApi.stats(dateParams).then((r) => r.data),
    enabled:  !isLoading && !!user && !!user.id && hasPerm(user, "advertisers"),
    retry:    false,
    staleTime: 0,
  });
}

// ── List ──────────────────────────────────────────────────────────────────────
export function useAdvertisers(filters = {}) {
  const { user, isLoading } = useAuth();
  return useQuery({
    queryKey: ["advertisers", "list", user?.id, filters],
    queryFn:  () => advertisersApi.list(filters).then((r) => r.data),
    enabled:  !isLoading && !!user && !!user.id && hasPerm(user, "advertisers"),
    retry:    false,
  });
}

// ── My advertisers (Sales team) ───────────────────────────────────────────────
export function useMyAdvertisers(filters = {}) {
  const { user, isLoading } = useAuth();
  return useQuery({
    queryKey: ["advertisers", "my", user?.id, filters],
    queryFn:  () => advertisersApi.my(filters).then((r) => toArray(r.data)),
    enabled:  !isLoading && !!user && !!user.id && hasPerm(user, "advertisers"),
    retry:    false,
  });
}

// ── Single advertiser ─────────────────────────────────────────────────────────
export function useAdvertiser(id) {
  const { user, isLoading } = useAuth();
  return useQuery({
    queryKey: advertiserKeys.detail(id),
    queryFn:  () => advertisersApi.get(id).then((r) => r.data),
    enabled:  !isLoading && !!id && id !== "undefined" && !!user && !!user.id && hasPerm(user, "advertisers"),
    retry:    false,
    staleTime: 0,
  });
}

// ── Form choices ──────────────────────────────────────────────────────────────
export function useAdvertiserChoices() {
  const { user, isLoading } = useAuth();
  return useQuery({
    queryKey: ["advertisers", "choices", user?.id],
    queryFn:  () => advertisersApi.choices().then((r) => r.data),
    enabled:  !isLoading && !!user && !!user.id && hasPerm(user, "advertisers"),
    retry:    false,
    staleTime: 10 * 60 * 1000,
  });
}

// ── Create ────────────────────────────────────────────────────────────────────
export function useCreateAdvertiser() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data) => advertisersApi.create(data).then((r) => r.data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: advertiserKeys.all() });
    },
  });
}

// ── Update ────────────────────────────────────────────────────────────────────
export function useUpdateAdvertiser() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }) => advertisersApi.update(id, data).then((r) => r.data),
    onSuccess: (_, { id }) => {
      qc.invalidateQueries({ queryKey: advertiserKeys.detail(id) });
      qc.invalidateQueries({ queryKey: advertiserKeys.all() });
    },
  });
}

// ── Delete ────────────────────────────────────────────────────────────────────
export function useDeleteAdvertiser() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id) => advertisersApi.delete(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: advertiserKeys.all() });
    },
  });
}

// ── Status change ─────────────────────────────────────────────────────────────
export function useSetAdvertiserStatus() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, status }) => advertisersApi.setStatus(id, status).then((r) => r.data),
    onSuccess: (_, { id }) => {
      qc.invalidateQueries({ queryKey: advertiserKeys.detail(id) });
      qc.invalidateQueries({ queryKey: advertiserKeys.all() });
    },
  });
}

// ── Approve as New (MIS Approver) ────────────────────────────────────────────
export function useApproveAsNew(advertiserId) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (edits = {}) =>
      advertisersApi.approveAsNew(advertiserId, edits).then((r) => r.data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: advertiserKeys.detail(advertiserId) });
      qc.invalidateQueries({ queryKey: advertiserKeys.all() });
      qc.invalidateQueries({ queryKey: ["contacts"] });
    },
  });
}

// ── Map to Existing (MIS Approver) ───────────────────────────────────────────
export function useMapToExisting(advertiserId) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (targetAdvertiserId) =>
      advertisersApi.mapToExisting(advertiserId, targetAdvertiserId).then((r) => r.data),
    onSuccess: () => {
      qc.removeQueries({ queryKey: advertiserKeys.detail(advertiserId) });
      qc.invalidateQueries({ queryKey: advertiserKeys.all() });
      qc.invalidateQueries({ queryKey: ["contacts"] });
    },
  });
}

// ── Reject (MIS Approver) ─────────────────────────────────────────────────────
export function useRejectAdvertiser(advertiserId) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (reason) =>
      advertisersApi.reject(advertiserId, reason).then((r) => r.data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: advertiserKeys.detail(advertiserId) });
      qc.invalidateQueries({ queryKey: advertiserKeys.all() });
    },
  });
}

// ── Revert to Pending (MIS Approver / Admin) ─────────────────────────────────
export function useRevertAdvertiser(advertiserId) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (reason) =>
      advertisersApi.revertToPending(advertiserId, reason).then((r) => r.data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: advertiserKeys.detail(advertiserId) });
      qc.invalidateQueries({ queryKey: advertiserKeys.all() });
      qc.invalidateQueries({ queryKey: ["activity"] });
    },
  });
}

// ── Manager contacts (approver/admin only) ────────────────────────────────────
export function useManagerContacts(advertiserId) {
  const { user, isLoading } = useAuth();
  return useQuery({
    queryKey: ["advertiser", advertiserId, "manager-contacts"],
    queryFn:  () => advertisersApi.managerContacts(advertiserId).then((r) => r.data),
    enabled:  !isLoading && !!user && !!user.id && !!advertiserId &&
              (user.role === "admin" || user.is_mis_approver),
    retry:    false,
  });
}

// ── Eligible managers (approver/admin only) ───────────────────────────────────
export function useEligibleManagers() {
  const { user, isLoading } = useAuth();
  return useQuery({
    queryKey: ["eligible-managers"],
    queryFn:  () => advertisersApi.eligibleManagers().then((r) => r.data),
    enabled:  !isLoading && !!user && !!user.id &&
              (user.role === "admin" || user.is_mis_approver),
    retry:    false,
    staleTime: 60_000,
  });
}

// ── Unmerge (MIS Approver / Admin) ───────────────────────────────────────────
export function useUnmergeAdvertiser(advertiserId) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: () => advertisersApi.unmerge(advertiserId).then((r) => r.data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: advertiserKeys.detail(advertiserId) });
      qc.invalidateQueries({ queryKey: advertiserKeys.all() });
      qc.invalidateQueries({ queryKey: ["contacts"] });
    },
  });
}

// ── Export (Admin / Approver only) ───────────────────────────────────────────
export function useExportAdvertisers() {
  const [isExporting, setIsExporting] = useState(false);

  const exportData = async (format, filters = {}) => {
    setIsExporting(true);
    try {
      const response = await advertisersApi.export(format, filters);

      const contentDisposition = response.headers["content-disposition"] || "";
      const filenameMatch = contentDisposition.match(/filename="(.+)"/);
      const filename = filenameMatch
        ? filenameMatch[1]
        : `advertisers_export.${format}`;

      const blob = new Blob([response.data]);
      const url  = window.URL.createObjectURL(blob);
      const a    = document.createElement("a");
      a.href     = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);

      return { success: true, filename };
    } catch (err) {
      console.error("Export failed:", err);
      throw err;
    } finally {
      setIsExporting(false);
    }
  };

  return { exportData, isExporting };
}

// ── Manage managers mutation ──────────────────────────────────────────────────
export function useManageManagers(advertiserId) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data) =>
      advertisersApi.manageManagers(advertiserId, data).then((r) => r.data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["advertiser", advertiserId] });
      qc.invalidateQueries({ queryKey: advertiserKeys.all() });
      qc.invalidateQueries({ queryKey: ["contacts"] });
    },
  });
}
