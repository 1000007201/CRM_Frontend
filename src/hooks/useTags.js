/**
 * hooks/useTags.js
 *
 * React Query hooks for all tag operations.
 * Components call these hooks — never tagsApi directly.
 */
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { tagsApi }  from "@/api/tags";
import { useAuth }  from "@/hooks/useAuth";
import { hasPerm }  from "@/utils/permissions";

// ── Query keys ────────────────────────────────────────────────────────────────
export const tagKeys = {
  all:    ()        => ["tags"],
  list:   (filters) => ["tags", "list", filters],
  detail: (id)      => ["tags", "detail", id],
};

// ── List ──────────────────────────────────────────────────────────────────────
export function useTags(filters = {}) {
  const { user, isLoading } = useAuth();
  return useQuery({
    queryKey: ["tags", "list", user?.id, filters],
    queryFn:  () => tagsApi.list(filters).then((r) => r.data),
    enabled:  !isLoading && !!user && !!user.id && hasPerm(user, "tags"),
    retry:    false,
  });
}

// ── Single ────────────────────────────────────────────────────────────────────
export function useTag(id) {
  const { user, isLoading } = useAuth();
  return useQuery({
    queryKey: tagKeys.detail(id),
    queryFn:  () => tagsApi.get(id).then((r) => r.data),
    enabled:  !isLoading && !!id && id !== "undefined" && !!user && !!user.id && hasPerm(user, "tags"),
    retry:    false,
    staleTime: 0,
  });
}

// ── Create ────────────────────────────────────────────────────────────────────
export function useCreateTag() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data) => tagsApi.create(data).then((r) => r.data),
    onSuccess:  () => qc.invalidateQueries({ queryKey: tagKeys.all() }),
  });
}

// ── Rename ────────────────────────────────────────────────────────────────────
export function useRenameTag() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, name }) => tagsApi.rename(id, name).then((r) => r.data),
    onSuccess:  () => qc.invalidateQueries({ queryKey: tagKeys.all() }),
  });
}

// ── Merge ─────────────────────────────────────────────────────────────────────
export function useMergeTag() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, targetId }) => tagsApi.mergeInto(id, targetId).then((r) => r.data),
    onSuccess:  () => qc.invalidateQueries({ queryKey: tagKeys.all() }),
  });
}

// ── Delete ────────────────────────────────────────────────────────────────────
export function useDeleteTag() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id) => tagsApi.delete(id).then((r) => r.data),
    onSuccess:  () => qc.invalidateQueries({ queryKey: tagKeys.all() }),
  });
}
