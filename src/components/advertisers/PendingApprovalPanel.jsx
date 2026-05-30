/**
 * components/advertisers/PendingApprovalPanel.jsx
 *
 * Unified approval flow:
 *   1. Initial state  — Approve / Reject buttons
 *   2. Approve mode   — search existing advertisers; Map or Add as New
 *   3. Add-new form   — editable pre-filled fields → Confirm Approval
 *   4. Reject mode    — optional reason textarea → Confirm Rejection
 */
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useToast } from "@/components/common/Toast";
import { useIsMobile } from "@/hooks/useIsMobile";
import {
  useApproveAsNew,
  useMapToExisting,
  useRejectAdvertiser,
  useAdvertisers,
} from "@/hooks/useAdvertisers";
import Autocomplete from "@/components/common/Autocomplete";
import { COMMON_COUNTRIES } from "@/utils/countries";
import { REGIONS } from "@/constants/regions";

const toArray = (d) => (Array.isArray(d) ? d : (d?.results ?? []));

const FIELD_LABELS = {
  full_name:       "Full Name",
  type:            "Type",
  email:           "Email",
  mobile:          "Mobile",
  region:          "Region",
  country:         "Country",
  city:            "City",
  billing_entity:  "Billing Entity",
  billing_address: "Billing Address",
};

export default function PendingApprovalPanel({ advertiser, editableFields }) {
  const toast    = useToast();
  const navigate = useNavigate();
  const isMobile = useIsMobile();

  const [mode,             setMode]             = useState(null); // null | "approve" | "reject"
  const [selectedExisting, setSelectedExisting] = useState(null);
  const [showAddNewForm,   setShowAddNewForm]   = useState(false);
  const [rejectReason,     setRejectReason]     = useState("");

  const [edits, setEdits] = useState(() => {
    const initial = {};
    (editableFields || []).forEach((f) => { initial[f] = advertiser[f] || ""; });
    return initial;
  });

  const approveMutation = useApproveAsNew(advertiser.id);
  const mapMutation     = useMapToExisting(advertiser.id);
  const rejectMutation  = useRejectAdvertiser(advertiser.id);

  const { data: rawApproved } = useAdvertisers({ status: "approved" });
  const approvedList = toArray(rawApproved).filter((a) => a.id !== advertiser.id);

  const approvedOptions = approvedList.map((a) => ({
    id:       a.id,
    label:    a.full_name,
    sublabel: a.internal_id || a.display_id || "",
  }));

  const resetApproveFlow = () => {
    setSelectedExisting(null);
    setShowAddNewForm(false);
    setMode(null);
  };

  const handleMapToExisting = async () => {
    if (!selectedExisting) { toast.error("Select an existing advertiser to map to."); return; }
    try {
      await mapMutation.mutateAsync(selectedExisting.id);
      toast.success(`Mapped to ${selectedExisting.full_name}`);
      navigate("/advertisers", { replace: true });
    } catch (err) {
      toast.error(err?.response?.data?.error || "Failed to map.");
    }
  };

  const handleApproveAsNew = async () => {
    if (!edits.full_name?.trim()) { toast.error("Full name is required."); return; }
    try {
      await approveMutation.mutateAsync(edits);
      toast.success("Advertiser approved as new.");
      resetApproveFlow();
    } catch (err) {
      toast.error(err?.response?.data?.error || "Failed to approve.");
    }
  };

  const handleReject = async () => {
    try {
      await rejectMutation.mutateAsync(rejectReason.trim());
      toast.success("Advertiser rejected.");
      setMode(null);
    } catch (err) {
      toast.error(err?.response?.data?.error || "Failed to reject.");
    }
  };

  const isBusy = approveMutation.isPending || mapMutation.isPending || rejectMutation.isPending;

  return (
    <div style={{
      background:   "var(--white)",
      border:       "1px solid #E0B84A",
      borderRadius: 4,
      padding:      "16px 20px",
    }}>
      {/* Header */}
      <p style={{
        fontSize: 10, fontWeight: 700, textTransform: "uppercase",
        letterSpacing: "0.08em", color: "#A06010", margin: "0 0 4px",
      }}>
        ⏳ Pending Review
      </p>
      <p style={{ fontSize: 11, color: "var(--text2)", margin: "0 0 14px" }}>
        Submitted by {advertiser.created_by_name || "—"}
      </p>

      {/* ── Initial: Approve + Reject ── */}
      {!mode && (
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          <button className="btn btn-primary" onClick={() => setMode("approve")}>
            Review
          </button>
          <button
            className="btn btn-danger"
            onClick={() => setMode("reject")}
            style={{ background: "none", color: "#8A1A1A", border: "1px solid #F0A8A8" }}
          >
            Reject
          </button>
        </div>
      )}

      {/* ── Approve flow ── */}
      {mode === "approve" && (
        <div style={{ marginTop: 4 }}>
          {!showAddNewForm && (
            <>
              <p style={{ fontSize: 13, fontWeight: 600, color: "var(--text)", marginBottom: 4 }}>
                Check if this advertiser already exists
              </p>
              <p style={{ fontSize: 11, color: "var(--text3)", marginBottom: 10 }}>
                Search by name. Select to map, or click "Add as New Advertiser" if no match.
              </p>

              <div className="form-group" style={{ marginBottom: 12 }}>
                <label className="form-label">Search and pick an existing advertiser:</label>
                <Autocomplete
                  options={approvedOptions}
                  value={selectedExisting?.id || ""}
                  onChange={(id) => {
                    const found = approvedList.find((a) => a.id === id);
                    setSelectedExisting(found || null);
                  }}
                  placeholder="Type to search approved advertisers…"
                  emptyMessage="No matches found."
                  hideWhenEmpty
                />
              </div>

              <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                <button
                  className="btn btn-primary"
                  onClick={handleMapToExisting}
                  disabled={!selectedExisting || isBusy}
                >
                  {mapMutation.isPending ? "Mapping…" : "Map to Existing"}
                </button>
                <button
                  className="btn btn-secondary"
                  onClick={() => setShowAddNewForm(true)}
                  disabled={isBusy}
                >
                  Add as New Advertiser
                </button>
                <button className="btn btn-secondary" onClick={resetApproveFlow} disabled={isBusy}>
                  Cancel
                </button>
              </div>
            </>
          )}

          {/* ── Add-new form ── */}
          {showAddNewForm && (
            <>
              <p style={{ fontSize: 13, fontWeight: 600, color: "var(--text)", marginBottom: 4 }}>
                Approve as New Advertiser
              </p>
              <p style={{ fontSize: 11, color: "var(--text3)", marginBottom: 12 }}>
                Review and edit the details below, then click Confirm Approval.
              </p>

              <div style={{
                display:             "grid",
                gridTemplateColumns: isMobile ? "1fr" : "repeat(2, 1fr)",
                gap:                 10,
                marginBottom:        12,
              }}>
                {(editableFields || []).map((f) => {
                  const label = FIELD_LABELS[f] || f.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
                  const isRequired = f === "full_name";

                  if (f === "region") {
                    return (
                      <div className="form-group" key={f}>
                        <label className="form-label">{label}{isRequired ? " *" : ""}</label>
                        <select
                          className="form-select"
                          value={edits[f] || ""}
                          onChange={(e) => setEdits({ ...edits, [f]: e.target.value })}
                        >
                          <option value="">— Select region —</option>
                          {REGIONS.map((r) => (
                            <option key={r.value} value={r.value}>{r.label}</option>
                          ))}
                        </select>
                      </div>
                    );
                  }

                  if (f === "country") {
                    return (
                      <div className="form-group" key={f}>
                        <label className="form-label">{label}{isRequired ? " *" : ""}</label>
                        <select
                          className="form-select"
                          value={edits[f] || ""}
                          onChange={(e) => setEdits({ ...edits, [f]: e.target.value })}
                        >
                          <option value="">— Select country —</option>
                          {COMMON_COUNTRIES.map((c) => (
                            <option key={c.code} value={c.code}>{c.name}</option>
                          ))}
                        </select>
                      </div>
                    );
                  }

                  if (f === "billing_address") {
                    return (
                      <div className="form-group" key={f} style={{ gridColumn: isMobile ? undefined : "1 / -1" }}>
                        <label className="form-label">{label}</label>
                        <textarea
                          className="form-input"
                          rows={2}
                          value={edits[f] || ""}
                          onChange={(e) => setEdits({ ...edits, [f]: e.target.value })}
                          style={{ resize: "vertical" }}
                        />
                      </div>
                    );
                  }

                  if (f === "email") {
                    return (
                      <div className="form-group" key={f}>
                        <label className="form-label">{label}</label>
                        <input
                          className="form-input"
                          value={edits[f] || ""}
                          disabled
                          style={{ opacity: 0.6, cursor: "not-allowed" }}
                        />
                      </div>
                    );
                  }

                  return (
                    <div className="form-group" key={f}>
                      <label className="form-label">{label}{isRequired ? " *" : ""}</label>
                      <input
                        className="form-input"
                        value={edits[f] || ""}
                        onChange={(e) => setEdits({ ...edits, [f]: e.target.value })}
                      />
                    </div>
                  );
                })}
              </div>

              <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                <button
                  className="btn btn-primary"
                  onClick={handleApproveAsNew}
                  disabled={isBusy}
                >
                  {approveMutation.isPending ? "Approving…" : "Confirm Approval"}
                </button>
                <button
                  className="btn btn-secondary"
                  onClick={() => setShowAddNewForm(false)}
                  disabled={isBusy}
                >
                  Back to Search
                </button>
                <button className="btn btn-secondary" onClick={resetApproveFlow} disabled={isBusy}>
                  Cancel
                </button>
              </div>
            </>
          )}
        </div>
      )}

      {/* ── Reject flow ── */}
      {mode === "reject" && (
        <div style={{ marginTop: 4 }}>
          <div className="form-group">
            <label className="form-label">Reason for rejection (optional):</label>
            <textarea
              className="form-input"
              rows={3}
              value={rejectReason}
              onChange={(e) => setRejectReason(e.target.value)}
              placeholder="Explain why this submission is being rejected…"
              style={{ resize: "vertical" }}
              autoFocus
            />
          </div>
          <div style={{ display: "flex", gap: 8, marginTop: 8, flexWrap: "wrap" }}>
            <button
              className="btn btn-danger"
              onClick={handleReject}
              disabled={isBusy}
              style={{ background: "none", color: "#8A1A1A", border: "1px solid #F0A8A8" }}
            >
              {rejectMutation.isPending ? "Rejecting…" : "Confirm Rejection"}
            </button>
            <button className="btn btn-secondary" onClick={() => setMode(null)} disabled={isBusy}>
              Cancel
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
