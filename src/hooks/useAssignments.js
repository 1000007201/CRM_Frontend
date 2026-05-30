/**
 * hooks/useAssignments.js
 */
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { assignmentsApi } from "@/api/assignments";
import { useAuth }        from "@/hooks/useAuth";
import { hasPerm }        from "@/utils/permissions";

const toArray = (data) => (Array.isArray(data) ? data : (data?.results ?? []));
import { leadKeys }     from "@/hooks/useLeads";
import { activityKeys } from "@/hooks/useActivity";

export const assignmentKeys = {
  all:        ()       => ["assignments"],
  workload:   ()       => ["assignments", "workload"],
  unassigned: ()       => ["assignments", "unassigned"],
  mine:       ()       => ["assignments", "mine"],
  history:    (leadId) => ["assignments", "history", leadId],
};

export function useWorkload() {
  const { user, isLoading } = useAuth();
  return useQuery({
    queryKey: ["assignments", "workload", user?.id],
    queryFn:  () => assignmentsApi.workload().then((r) => toArray(r.data)),
    enabled:  !isLoading && !!user && !!user.id && hasPerm(user, "sales_crm"),
    retry:    false,
    staleTime: 30_000,
  });
}

export function useUnassignedLeads() {
  const { user, isLoading } = useAuth();
  return useQuery({
    queryKey: ["assignments", "unassigned", user?.id],
    queryFn:  () => assignmentsApi.unassigned().then((r) => toArray(r.data)),
    enabled:  !isLoading && !!user && !!user.id && hasPerm(user, "sales_crm"),
    retry:    false,
  });
}

export function useMyAssignments() {
  const { user, isLoading } = useAuth();
  return useQuery({
    queryKey: ["assignments", "mine", user?.id],
    queryFn:  () => assignmentsApi.mine().then((r) => toArray(r.data)),
    enabled:  !isLoading && !!user && !!user.id && hasPerm(user, "sales_crm"),
    retry:    false,
  });
}

export function useBulkAssign() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ leadIds, assignedTo, note }) =>
      assignmentsApi.bulkAssign(leadIds, assignedTo, note).then((r) => r.data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: leadKeys.all() });
      qc.invalidateQueries({ queryKey: assignmentKeys.all() });
      qc.invalidateQueries({ queryKey: activityKeys.all() });
    },
  });
}
