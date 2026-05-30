/**
 * hooks/useUsers.js
 */
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { usersApi }            from "@/api/users";
import { useAuth }             from "@/hooks/useAuth";
import { hasPerm }             from "@/utils/permissions";
import { getAdminAccessToken } from "@/utils/token";

// DRF can return either a plain array or { count, results: [] }
const toArray = (data) => (Array.isArray(data) ? data : (data?.results ?? []));

export const userKeys = {
  all:      ()       => ["users"],
  list:     (params) => ["users", "list", params],
  detail:   (id)     => ["users", "detail", id],
  managers: ()       => ["users", "managers"],
  team:     ()       => ["users", "team"],
};

export function useUsers(params = {}) {
  const { user, isLoading } = useAuth();
  return useQuery({
    queryKey: ["users", "list", user?.id, params],
    queryFn:  () => usersApi.list(params).then((r) => toArray(r.data)),
    enabled:  !isLoading && !!user && !!user.id && (user.role === "admin" || hasPerm(user, "users")),
    retry:    false,
  });
}

export function useUser(id) {
  const { user, isLoading } = useAuth();
  return useQuery({
    queryKey: userKeys.detail(id),
    queryFn:  () => usersApi.get(id).then((r) => r.data),
    enabled:  !isLoading && !!id && id !== "undefined" && !!user && !!user.id && (user.role === "admin" || hasPerm(user, "users")),
    retry:    false,
  });
}

export function useManagers() {
  const { user, isLoading } = useAuth();
  return useQuery({
    queryKey: ["users", "managers", user?.id],
    queryFn:  () => usersApi.managers().then((r) => toArray(r.data)),
    enabled:  !isLoading && !!user && !!user.id && (user.role === "admin" || hasPerm(user, "users")),
    retry:    false,
  });
}

/** Sales managers + members — for advertiser/publisher assignment dropdowns */
export function useSalesStaff() {
  const { user, isLoading } = useAuth();
  return useQuery({
    queryKey: ["users", "sales-staff", user?.id],
    queryFn:  () => usersApi.salesStaff().then((r) => toArray(r.data)),
    enabled:  !isLoading && !!user && !!user.id && (hasPerm(user, "advertisers") || hasPerm(user, "publishers")),
    retry:    false,
    staleTime: 5 * 60 * 1000,
  });
}

/** Sales employees the current user can assign leads to */
export function useTeam() {
  const { user, isLoading } = useAuth();
  return useQuery({
    queryKey: ["users", "team", user?.id],
    queryFn:  () => usersApi.team().then((r) => toArray(r.data)),
    enabled:  !isLoading && !!user && !!user.id && (
      user.role === "admin" ||
      user.role === "manager" ||
      hasPerm(user, "sales_crm")
    ),
    retry:    false,
    staleTime: 30_000,
  });
}

export function useCreateUser() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data) => usersApi.create(data).then((r) => r.data),
    onSuccess:  () => qc.invalidateQueries({ queryKey: userKeys.all() }),
  });
}

export function useDeleteUser() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id) => usersApi.delete(id),
    onSuccess:  () => qc.invalidateQueries({ queryKey: userKeys.all() }),
  });
}

export function usePendingCount() {
  const { user, isLoading } = useAuth();
  return useQuery({
    queryKey: ["users", "pending-count", user?.id],
    queryFn:  () => usersApi.pendingCount().then((r) => r.data),
    enabled:  !isLoading && !!user && !!user.id && (user.role === "admin" || hasPerm(user, "users")),
    retry:    false,
    staleTime: 30_000,
  });
}

// ── Switcher list (admin impersonation) ───────────────────────────────────────
export function useSwitcherList() {
  const { user, isLoading } = useAuth();
  return useQuery({
    queryKey: ["switcher-list"],
    queryFn:  () => usersApi.switcherList().then((r) => r.data),
    enabled:  !isLoading && (user?.role === "admin" || !!getAdminAccessToken()),
    retry:    false,
    staleTime: 30_000,
  });
}

export function useImpersonate() {
  return useMutation({
    mutationFn: (userId) => usersApi.impersonate(userId),
  });
}

export function useSetPermissions(userId) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (permissions) => usersApi.setPermissions(userId, permissions),
    onSuccess: () => {
      queryClient.invalidateQueries(["users"]);
      queryClient.invalidateQueries(["user", userId]);
    },
  });
}

export function useUpdateUser() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }) => usersApi.update(id, data).then((r) => r.data),
    onSuccess:  (_, { id }) => {
      qc.invalidateQueries({ queryKey: userKeys.detail(id) });
      qc.invalidateQueries({ queryKey: userKeys.all() });
    },
  });
}
