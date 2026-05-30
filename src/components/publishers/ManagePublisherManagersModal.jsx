import { useState } from "react";
import Modal        from "@/components/common/Modal";
import { useToast } from "@/components/common/Toast";
import {
  useManagePublisherManagers,
  useEligiblePublisherManagers,
} from "@/hooks/usePublishers";

export default function ManagePublisherManagersModal({ publisher, onClose }) {
  const toast = useToast();

  const currentIds = (publisher.managers ?? []).map((m) => m.id);
  const [selectedIds, setSelectedIds] = useState(new Set(currentIds));

  const { data: eligible = [], isLoading } = useEligiblePublisherManagers();
  const manageMutation = useManagePublisherManagers(publisher.id);

  const toggle = (id) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const handleSave = async () => {
    try {
      await manageMutation.mutateAsync([...selectedIds]);
      toast.success("Managers updated.");
      onClose();
    } catch (err) {
      toast.error(err?.response?.data?.error || "Could not update managers.");
    }
  };

  return (
    <Modal
      open
      onClose={onClose}
      title="Manage Managers"
      subtitle={`Publisher: ${publisher.full_name}`}
      size="narrow"
      footer={
        <div className="modal-footer">
          <button className="btn btn-secondary" onClick={onClose} disabled={manageMutation.isPending}>
            Cancel
          </button>
          <button className="btn btn-primary" onClick={handleSave} disabled={manageMutation.isPending}>
            {manageMutation.isPending ? "Saving…" : "Save"}
          </button>
        </div>
      }
    >
      {isLoading ? (
        <p style={{ fontSize: 13, color: "var(--text3)", padding: "8px 0" }}>Loading…</p>
      ) : eligible.length === 0 ? (
        <p style={{ fontSize: 13, color: "var(--text3)", padding: "8px 0" }}>
          No eligible managers found.
        </p>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
          {eligible.map((u) => {
            const checked = selectedIds.has(u.id);
            return (
              <label
                key={u.id}
                style={{
                  display:      "flex",
                  alignItems:   "center",
                  gap:          10,
                  padding:      "9px 12px",
                  borderRadius: 4,
                  cursor:       "pointer",
                  background:   checked ? "var(--accent-lt, #EEF2FF)" : "transparent",
                  border:       checked ? "1px solid var(--accent, #6366F1)" : "1px solid transparent",
                  transition:   "background 0.1s",
                }}
              >
                <input
                  type="checkbox"
                  checked={checked}
                  onChange={() => toggle(u.id)}
                  style={{ accentColor: "var(--accent)", width: 14, height: 14, flexShrink: 0 }}
                />
                <div>
                  <div style={{ fontSize: 13, fontWeight: checked ? 600 : 500, color: "var(--text)" }}>
                    {u.full_name}
                  </div>
                  {u.display_role && (
                    <div style={{ fontSize: 11, color: "var(--text3)" }}>{u.display_role}</div>
                  )}
                </div>
              </label>
            );
          })}
        </div>
      )}
    </Modal>
  );
}
