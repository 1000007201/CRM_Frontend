import api from "./axios";

export const contactsApi = {
  list: (params = {}) => api.get("/contacts/", { params }),
  get: (id) => api.get(`/contacts/${id}/`),
  create: (data) => api.post("/contacts/", data),
  update: (id, data) => api.patch(`/contacts/${id}/`, data),
  delete: (id) => api.delete(`/contacts/${id}/`),
  mapToAdvertiser: (id, data) => api.post(`/contacts/${id}/map_to_advertiser/`, data),
  myAdvertisers: () => api.get("/contacts/my-advertisers/"),
  assignOwner: (id, newOwnerId) => api.post(`/contacts/${id}/assign-owner/`, { new_owner_id: newOwnerId }),
  approve: (id) => api.post(`/contacts/${id}/approve/`),
  setStatus: (id, status) => api.post(`/contacts/${id}/set-status/`, { status }),
  forAdvertiser: (advertiserId) =>
    api.get("/contacts/for-advertiser/", { params: { advertiser_id: advertiserId } }),
};
