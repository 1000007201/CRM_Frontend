/**
 * components/advertisers/ManageManagersModal.jsx
 *
 * Admin/Approver modal to assign or remove managers from an advertiser.
 * When removing a manager who owns contacts the user must choose per-manager:
 *   • Transfer → pick a remaining manager to inherit the contacts
 *   • Leave unassigned → contacts will have no owner (admin can reassign later)
 */
import { useState, useEffect } from "react";
import Modal       from "@/components/common/Modal";
import { useToast } from "@/components/common/Toast";
import {
  useManagerContacts,
  useEligibleManagers,
  useManageManagers,
} from "@/hooks/useAdvertisers";

export default function ManageManagersModal({ advertiser, onClose, onSaved }) {
  const toast = useToast();

  const { data }                        = useManagerContacts(advertiser.id);
  const currentManagers                 = data?.managers ?? [];
  const { data: eligibleUsers = [] }    = useEligibleManagers();
  const manageMutation                  = useManageManagers(advertiser.id);

  const [selectedIds,     setSelectedIds]     = useState(new Set());
  const [decisions,       setDecisions]       = useState({});
  const [transferTargets, setTransferTargets] = useState({});

  const managerIdsKey = currentManagers.map((m) => m.id).sort().join(",");

  useEffect(() => {
    setSelectedIds(new Set(currentManagers.map((m) => m.id)));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [managerIdsKey]);

  const toggle = (userId) => {
    const willBeAdded = !selectedIds.has(userId);
    setSelectedIds((prev) => {
      const next = new Set(prev);
      next.has(userId) ? next.delete(userId) : next.add(userId);
      return next;
    });
    if (willBeAdded) {
      setDecisions((d)       => { const n = { ...d }; delete n[userId]; return n; });
      setTransferTargets((t) => { const n = { ...t }; delete n[userId]; return n; });
    }
  };

  const removedWithContacts = currentManagers.filter(
    (m) => !selectedIds.has(m.id) && m.contact_count > 0
  );

  const canSave = removedWithContacts.every((m) => {
    const decision = decisions[m.id];
    if (!decision) return false;
    if (decision === "transfer") return !!transferTargets[m.id];
    return true;
  });

  const handleSave = async () => {
    const contact_transfers = {};
    const leave_unassigned  = [];

    for (const m of removedWithContacts) {
      if (decisions[m.id] === "transfer") {
        contact_transfers[m.id] = transferTargets[m.id];
      } else {
        leave_unassigned.push(m.id);
      }
    }

    try {
      await manageMutation.mutateAsync({
        manager_ids: Array.from(selectedIds),
        contact_transfers,
        leave_unassigned,
      });
      toast.success("Managers updated successfully");
      onSaved?.();
      onClose();
    } catch (err) {
      const detail = err.response?.data?.error || "Failed to update managers";
      toast.error(detail);
    }
  };

  return (
    <Modal
      open
      onClose={onClose}
      title="Manage Managers"
      subtitle={advertiser.full_name}
      size="md"
      footer={
        <div className="modal-footer">
          <button className="btn btn-secondary" onClick={onClose}>
            Cancel
          </button>
          <button
            className="btn btn-primary"
            onClick={handleSave}
            disabled={!canSave || manageMutation.isPending}
          >
            {manageMutation.isPending ? "Saving…" : "Save Changes"}
          </button>
        </div>
      }
    >
      <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>

        <div>
          <div style={{ fontSize: 12, fontWeight: 600, marginBottom: 8, color: "var(--text)" }}>
            Eligible Users (Advertisers permission)
          </div>

          <div style={{
            maxHeight:    320,
            overflowY:    "auto",
            border:       "1px solid var(--border)",
            borderRadius: 4,
          }}>
            {eligibleUsers.length === 0 ? (
              <div style={{ padding: 12, color: "var(--text3)", fontSize: 12 }}>
                No eligible users.
              </div>
            ) : (
              eligibleUsers.map((u) => {
                const isSelected     = selectedIds.has(u.id);
                const currentManager = currentManagers.find((m) => m.id === u.id);
                const contactCount   = currentManager?.contact_count ?? 0;
                const isBeingRemoved = !!currentManager && !isSelected;
                const hasContacts    = contactCount > 0;
                const decision       = decisions[u.id];

                const transferCandidates = eligibleUsers.filter(
                  (eu) => selectedIds.has(eu.id) && eu.id !== u.id
                );

                return (
                  <div
                    key={u.id}
                    style={{
                      padding:      "10px 12px",
                      borderBottom: "1px solid var(--border)",
                      background:   isBeingRemoved && hasContacts ? "#FFF8E1" : "var(--white)",
                    }}
                  >
                    <label style={{ display: "flex", alignItems: "center", gap: 8, cursor: "pointer" }}>
                      <input
                        type="checkbox"
                        checked={isSelected}
                        onChange={() => toggle(u.id)}
                      />
                      <div style={{ flex: 1 }}>
                        <div style={{ fontSize: 13, fontWeight: 500, color: "var(--text)" }}>
                          {u.full_name}
                        </div>
                        <div style={{ fontSize: 11, color: "var(--text3)" }}>{u.email}</div>
                      </div>
                      {contactCount > 0 && (
                        <span style={{
                          fontSize:     11,
                          padding:      "2px 8px",
                          borderRadius: 10,
                          background:   "var(--accent-lt, #EEF2FF)",
                          color:        "var(--accent)",
                          fontWeight:   600,
                          flexShrink:   0,
                        }}>
                          {contactCount} contact{contactCount > 1 ? "s" : ""}
                        </span>
                      )}
                    </label>

                    {isBeingRemoved && hasContacts && (
                      <div style={{ marginTop: 10, marginLeft: 24 }}>
                        <div style={{ fontSize: 11, color: "#7A5800", marginBottom: 6, fontWeight: 600 }}>
                          ⚠ {contactCount} contact{contactCount > 1 ? "s" : ""} — what should happen to them?
                        </div>
                        <div style={{ display: "flex", flexDirection: "column", gap: 5 }}>
                          <label style={{ display: "flex", alignItems: "center", gap: 6, cursor: "pointer", fontSize: 12, color: "var(--text)" }}>
                            <input
                              type="radio"
                              name={`decision-${u.id}`}
                              value="transfer"
                              checked={decision === "transfer"}
                              onChange={() => setDecisions((d) => ({ ...d, [u.id]: "transfer" }))}
                            />
                            Transfer to another manager
                          </label>
                          <label style={{ display: "flex", alignItems: "center", gap: 6, cursor: "pointer", fontSize: 12, color: "var(--text)" }}>
                            <input
                              type="radio"
                              name={`decision-${u.id}`}
                              value="unassigned"
                              checked={decision === "unassigned"}
                              onChange={() => setDecisions((d) => ({ ...d, [u.id]: "unassigned" }))}
                            />
                            Leave unassigned (admin can reassign later)
                          </label>
                        </div>
                        {decision === "transfer" && (
                          <select
                            value={transferTargets[u.id] || ""}
                            onChange={(e) => setTransferTargets((t) => ({ ...t, [u.id]: e.target.value }))}
                            className="form-select"
                            style={{ width: "100%", maxWidth: 280, marginTop: 8 }}
                          >
                            <option value="">— Select transfer target —</option>
                            {transferCandidates.map((eu) => (
                              <option key={eu.id} value={eu.id}>{eu.full_name}</option>
                            ))}
                          </select>
                        )}
                      </div>
                    )}
                  </div>
                );
              })
            )}
          </div>
        </div>

        {!canSave && removedWithContacts.length > 0 && (
          <div style={{
            padding:      10,
            background:   "#FEE2E2",
            border:       "1px solid #FCA5A5",
            borderRadius: 3,
            fontSize:     12,
            color:        "#991B1B",
          }}>
            Please decide what to do with contacts for all removed managers before saving.
          </div>
        )}

      </div>
    </Modal>
  );
}
