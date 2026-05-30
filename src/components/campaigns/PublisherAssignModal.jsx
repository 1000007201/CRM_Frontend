/**
 * components/campaigns/PublisherAssignModal.jsx
 *
 * Modal for assigning a publisher to a campaign.
 * Excludes already-assigned publishers from the dropdown.
 */
import { useState } from "react";
import Modal        from "@/components/common/Modal";
import { useToast } from "@/components/common/Toast";
import { usePublishers } from "@/hooks/usePublishers";
import { useAssignPublisher } from "@/hooks/useCampaigns";

const toArray = (d) => Array.isArray(d) ? d : (d?.results ?? []);

export default function PublisherAssignModal({
  campaignId,
  assignedPublisherIds = [],
  onClose,
  onSaved,
}) {
  const toast = useToast();
  const [publisherId, setPublisherId] = useState("");
  const [search,      setSearch]      = useState("");
  const [notes,       setNotes]       = useState("");
  const [error,       setError]       = useState("");

  const { data: rawData } = usePublishers(search ? { search } : {});
  const allPublishers = toArray(rawData);
  const publishers    = allPublishers.filter(
    (p) => !assignedPublisherIds.includes(p.id)
  );

  const assignMutation = useAssignPublisher(campaignId);

  const handleSubmit = async () => {
    if (!publisherId) { setError("Please select a publisher."); return; }
    setError("");
    try {
      await assignMutation.mutateAsync({ publisher: publisherId, notes });
      toast.success("Publisher assigned!");
      onSaved?.();
      onClose();
    } catch (err) {
      const detail = err.response?.data;
      if (typeof detail === "object") {
        const msgs = Object.values(detail).flat();
        setError(msgs[0] ?? "Could not assign publisher.");
      } else {
        toast.error("Could not assign publisher.");
      }
    }
  };

  return (
    <Modal
      open
      onClose={assignMutation.isPending ? () => {} : onClose}
      title="Assign Publisher"
      subtitle="Add a publisher to this campaign"
      footer={
        <div className="modal-footer">
          <button className="btn btn-secondary" onClick={onClose} disabled={assignMutation.isPending}>
            Cancel
          </button>
          <button className="btn btn-primary" onClick={handleSubmit} disabled={assignMutation.isPending}>
            {assignMutation.isPending ? "Assigning…" : "Assign Publisher"}
          </button>
        </div>
      }
    >
      <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>

        <div className="form-group">
          <label className="form-label">Search Publisher</label>
          <input
            className="form-input"
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPublisherId(""); }}
            placeholder="Type to filter publishers…"
          />
        </div>

        <div className="form-group">
          <label className="form-label">Publisher *</label>
          <select
            className="form-select"
            value={publisherId}
            onChange={(e) => { setPublisherId(e.target.value); if (error) setError(""); }}
          >
            <option value="">— Select publisher —</option>
            {publishers.map((p) => (
              <option key={p.id} value={p.id}>
                {p.full_name ?? p.company_name ?? p.name}
                {p.specialization ? ` — ${p.specialization}` : ""}
              </option>
            ))}
          </select>
          {error && <p className="form-error">{error}</p>}
          {publishers.length === 0 && search && (
            <p style={{ fontSize: 10, color: "var(--text3)", marginTop: 4, fontStyle: "italic" }}>
              No unassigned publishers match "{search}".
            </p>
          )}
        </div>

        <div className="form-group">
          <label className="form-label">Notes (optional)</label>
          <textarea
            className="form-input"
            rows={2}
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Any notes for this publisher assignment…"
            style={{ resize: "vertical" }}
          />
        </div>

      </div>
    </Modal>
  );
}
