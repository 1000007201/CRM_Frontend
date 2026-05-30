import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { contactsApi } from "@/api/contacts";
import { useAuth }     from "@/hooks/useAuth";
import { hasPerm }     from "@/utils/permissions";

const toArray = (data) => (Array.isArray(data) ? data : (data?.results ?? []));

export const contactKeys = {
  all:    ()        => ["contacts"],
  list:   (filters) => ["contacts", "list", filters],
  detail: (id)      => ["contacts", "detail", id],
};

export function useContacts(filters = {}, options = {}) {
  const { user, isLoading } = useAuth();
  const extraEnabled = options.enabled ?? true;
  return useQuery({
    queryKey: ["contacts", "list", user?.id, filters],
    queryFn:  () => contactsApi.list(filters).then((r) => r.data),
    enabled:  !isLoading && !!user && !!user.id && hasPerm(user, "advertisers") && extraEnabled,
    retry:    false,
  });
}

export function useContact(id) {
  const { user, isLoading } = useAuth();
  return useQuery({
    queryKey: contactKeys.detail(id),
    queryFn:  () => contactsApi.get(id).then((r) => r.data),
    enabled:  !isLoading && !!id && id !== "undefined" && !!user && !!user.id && hasPerm(user, "advertisers"),
    retry:    false,
    staleTime: 0,
  });
}

export function useCreateContact() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data) => contactsApi.create(data).then((r) => r.data),
    onSuccess:  () => qc.invalidateQueries({ queryKey: contactKeys.all() }),
  });
}

export function useUpdateContact() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }) => contactsApi.update(id, data).then((r) => r.data),
    onSuccess:  (_, { id }) => {
      qc.invalidateQueries({ queryKey: contactKeys.detail(id) });
      qc.invalidateQueries({ queryKey: contactKeys.all() });
    },
  });
}

export function useDeleteContact() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id) => contactsApi.delete(id),
    onSuccess:  () => qc.invalidateQueries({ queryKey: contactKeys.all() }),
  });
}

export function useAssignContactOwner() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, newOwnerId }) => contactsApi.assignOwner(id, newOwnerId).then((r) => r.data),
    onSuccess:  () => qc.invalidateQueries({ queryKey: contactKeys.all() }),
  });
}

export function useApproveContact() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id) => contactsApi.approve(id).then((r) => r.data),
    onSuccess:  () => qc.invalidateQueries({ queryKey: contactKeys.all() }),
  });
}

export function useSetContactStatus(contactId) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (status) => contactsApi.setStatus(contactId, status).then((r) => r.data),
    onSuccess:  () => qc.invalidateQueries({ queryKey: contactKeys.all() }),
  });
}

export function useContactsForAdvertiser(advertiserId) {
  const { user, isLoading } = useAuth();
  return useQuery({
    queryKey: ["contacts", "for-advertiser", advertiserId, user?.id],
    queryFn:  () => contactsApi.forAdvertiser(advertiserId).then((r) => r.data),
    enabled:  !isLoading && !!user && !!user.id && !!advertiserId,
    retry:    false,
    staleTime: 30_000,
  });
}

export function useMyAdvertisersForContact() {
  const { user, isLoading } = useAuth();
  return useQuery({
    queryKey: ["contacts", "my-advertisers", user?.id],
    queryFn:  () => contactsApi.myAdvertisers().then((r) => r.data),
    enabled:  !isLoading && !!user && !!user.id && hasPerm(user, "advertisers"),
    retry:    false,
    staleTime: 30_000,
  });
}
