/**
 * components/campaigns/PendingCampaignApprovalPanel.jsx
 *
 * Inline approval panel for pending campaigns — shown to MIS approvers / admins.
 *
 * States:
 *   null    → Approve / Reject buttons
 *   approve → required-fields block + editable form → Confirm Approval
 *   reject  → reason textarea → Confirm Rejection
 */
import { useState } from "react";
import { useToast }    from "@/components/common/Toast";
import { useIsMobile } from "@/hooks/useIsMobile";
import { useApproveCampaign, useRejectCampaign } from "@/hooks/useCampaigns";
import { useSalesStaff } from "@/hooks/useUsers";
import {
  CAMPAIGN_CATEGORIES,
  CAMPAIGN_TYPES,
  CURRENCIES,
  TRACKING_TYPES,
} from "@/constants/campaign";

export default function PendingCampaignApprovalPanel({ campaign }) {
  const toast    = useToast();
  const isMobile = useIsMobile();

  const [mode,         setMode]         = useState(null);
  const [rejectReason, setRejectReason] = useState("");
  const [editErrors,   setEditErrors]   = useState({});

  const [edits, setEdits] = useState({
    superadme_campaign_name: campaign.superadme_campaign_name ?? "",
    ccn:                     campaign.ccn                     ?? "",
    reference_name:          campaign.reference_name          ?? "",
    campaign_id:             campaign.campaign_id             ?? "",
    sales_manager:           typeof campaign.sales_manager === "object"
                               ? (campaign.sales_manager?.id ?? "")
                               : (campaign.sales_manager     ?? ""),
    name:             campaign.name             ?? "",
    currency:         campaign.currency         ?? "",
    category:         campaign.category         ?? "",
    campaign_type:    campaign.campaign_type    ?? "",
    tracking_type:    campaign.tracking_type    ?? "",
    offline_report_link: campaign.offline_report_link ?? "",
    drr:              campaign.drr              ?? "",
    geos:             campaign.geos             ?? "",
    revenue:          campaign.revenue          ?? "",
    payout:           campaign.payout           ?? "",
    validation_terms: campaign.validation_terms ?? "",
    payment_terms:    campaign.payment_terms    ?? "",
    kpi:              campaign.kpi              ?? "",
  });

  const approveMutation = useApproveCampaign(campaign.id);
  const rejectMutation  = useRejectCampaign(campaign.id);
  const { data: salesStaff = [] } = useSalesStaff();

  const isBusy = approveMutation.isPending || rejectMutation.isPending;

  const updateEdit = (field, value) => {
    setEdits((prev) => ({ ...prev, [field]: value }));
    if (editErrors[field]) setEditErrors((prev) => ({ ...prev, [field]: "" }));
  };

  const handleApprove = async () => {
    const errs = {};

    if (!edits.superadme_campaign_name?.trim())
      errs.superadme_campaign_name = "SuperAdme Campaign Name is required for approval.";
    if (!edits.ccn?.trim())
      errs.ccn = "Campaign Name (CCN) is required for approval.";
    if (!edits.reference_name?.trim())
      errs.reference_name = "Reference Name is required for approval.";

    const trackingType = edits.tracking_type || campaign.tracking_type;
    if (trackingType === "offline") {
      const link = edits.offline_report_link ?? campaign.offline_report_link;
      if (!link || !String(link).trim())
        errs.offline_report_link = "Offline Report Link is required when Tracking is Offline.";
    }

    if (Object.keys(errs).length > 0) {
      setEditErrors(errs);
      toast.error("Please fix the highlighted fields before approving.");
      return;
    }

    try {
      await approveMutation.mutateAsync({ edits });
      toast.success("Campaign approved.");
      setMode(null);
    } catch (err) {
      toast.error(err?.response?.data?.error || "Could not approve campaign.");
    }
  };

  const handleReject = async () => {
    try {
      await rejectMutation.mutateAsync({ reason: rejectReason.trim() });
      toast.success("Campaign rejected.");
      setMode(null);
    } catch (err) {
      toast.error(err?.response?.data?.error || "Could not reject campaign.");
    }
  };

  const colGrid = {
    display:             "grid",
    gridTemplateColumns: isMobile ? "1fr" : "repeat(2, 1fr)",
    gap:                 10,
    marginBottom:        12,
  };

  return (
    <div style={{
      background:   "var(--white)",
      border:       "1px solid #E0B84A",
      borderRadius: 4,
      padding:      "16px 20px",
    }}>
      <p style={{
        fontSize: 10, fontWeight: 700, textTransform: "uppercase",
        letterSpacing: "0.08em", color: "#A06010", margin: "0 0 4px",
      }}>
        ⏳ Pending Review
      </p>
      <p style={{ fontSize: 11, color: "var(--text2)", margin: "0 0 14px" }}>
        Submitted by {campaign.created_by_name || "—"}
      </p>

      {/* Initial: Approve + Reject */}
      {!mode && (
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          <button className="btn btn-primary" onClick={() => setMode("approve")}>
            Review
          </button>
          <button
            onClick={() => setMode("reject")}
            style={{
              padding: "7px 14px", borderRadius: 3, fontSize: 12,
              fontWeight: 600, cursor: "pointer", fontFamily: "inherit",
              background: "none", color: "#8A1A1A", border: "1px solid #F0A8A8",
            }}
          >
            Reject
          </button>
        </div>
      )}

      {/* Approve flow */}
      {mode === "approve" && (
        <div>
          <p style={{ fontSize: 13, fontWeight: 600, color: "var(--text)", marginBottom: 4 }}>
            Review &amp; Confirm Approval
          </p>
          <p style={{ fontSize: 11, color: "var(--text3)", marginBottom: 12 }}>
            Fill in the required fields, adjust any submission details, then confirm.
          </p>

          {/* Required-for-approval block */}
          <div style={{
            padding:       16,
            background:    "#F9F4FF",
            border:        "1px solid #D6BCFF",
            borderRadius:  4,
            marginBottom:  16,
            display:       "flex",
            flexDirection: "column",
            gap:           14,
          }}>
            <div style={{ fontWeight: 700, fontSize: 13, color: "#4A1D85" }}>
              Required for Approval
            </div>

            <div className="form-group" style={{ marginBottom: 0 }}>
              <label className="form-label" style={{ display: "block", marginBottom: 6 }}>
                SuperAdme Campaign Name *
              </label>
              <input
                className="form-input"
                value={edits.superadme_campaign_name}
                onChange={(e) => updateEdit("superadme_campaign_name", e.target.value)}
              />
              {editErrors.superadme_campaign_name && (
                <p className="form-error" style={{ marginTop: 4 }}>
                  {editErrors.superadme_campaign_name}
                </p>
              )}
            </div>

            <div className="form-group" style={{ marginBottom: 0 }}>
              <label className="form-label" style={{ display: "block", marginBottom: 6 }}>
                Campaign Name (CCN) *
              </label>
              <input
                className="form-input"
                value={edits.ccn}
                onChange={(e) => updateEdit("ccn", e.target.value)}
              />
              {editErrors.ccn && (
                <p className="form-error" style={{ marginTop: 4 }}>{editErrors.ccn}</p>
              )}
            </div>

            <div className="form-group" style={{ marginBottom: 0 }}>
              <label className="form-label" style={{ display: "block", marginBottom: 6 }}>
                Reference Name *
              </label>
              <input
                className="form-input"
                value={edits.reference_name}
                onChange={(e) => updateEdit("reference_name", e.target.value)}
              />
              {editErrors.reference_name && (
                <p className="form-error" style={{ marginTop: 4 }}>{editErrors.reference_name}</p>
              )}
            </div>

            <div className="form-group" style={{ marginBottom: 0 }}>
              <label className="form-label" style={{ display: "block", marginBottom: 6 }}>
                Campaign ID (optional)
              </label>
              <input
                className="form-input"
                value={edits.campaign_id}
                onChange={(e) => updateEdit("campaign_id", e.target.value)}
              />
            </div>
          </div>

          {/* Editable submission fields */}
          <div style={colGrid}>
            <div className="form-group">
              <label className="form-label">Sales Manager</label>
              <select className="form-select" value={edits.sales_manager}
                onChange={(e) => updateEdit("sales_manager", e.target.value)}>
                <option value="">— Select sales manager —</option>
                {salesStaff.map((u) => (
                  <option key={u.id} value={u.id}>{u.full_name}</option>
                ))}
              </select>
            </div>

            <div className="form-group">
              <label className="form-label">Campaign Name</label>
              <input className="form-input" value={edits.name}
                onChange={(e) => updateEdit("name", e.target.value)} />
            </div>

            <div className="form-group">
              <label className="form-label">Category</label>
              <select className="form-select" value={edits.category}
                onChange={(e) => updateEdit("category", e.target.value)}>
                <option value="">— Select category —</option>
                {CAMPAIGN_CATEGORIES.map((c) => (
                  <option key={c.value} value={c.value}>{c.label}</option>
                ))}
              </select>
            </div>

            <div className="form-group">
              <label className="form-label">Campaign Type</label>
              <select className="form-select" value={edits.campaign_type}
                onChange={(e) => updateEdit("campaign_type", e.target.value)}>
                <option value="">— Select type —</option>
                {CAMPAIGN_TYPES.map((t) => (
                  <option key={t.value} value={t.value}>{t.label}</option>
                ))}
              </select>
            </div>

            <div className="form-group">
              <label className="form-label">Currency</label>
              <select className="form-select" value={edits.currency}
                onChange={(e) => updateEdit("currency", e.target.value)}>
                <option value="">— Select currency —</option>
                {CURRENCIES.map((c) => (
                  <option key={c.value} value={c.value}>{c.label}</option>
                ))}
              </select>
            </div>

            <div className="form-group">
              <label className="form-label">Tracking Type</label>
              <select className="form-select" value={edits.tracking_type}
                onChange={(e) => updateEdit("tracking_type", e.target.value)}>
                <option value="">— Select —</option>
                {TRACKING_TYPES.map((t) => (
                  <option key={t.value} value={t.value}>{t.label}</option>
                ))}
              </select>
            </div>

            <div className="form-group">
              <label className="form-label">Daily Run Rate</label>
              <input className="form-input" value={edits.drr}
                onChange={(e) => updateEdit("drr", e.target.value)} />
            </div>

            <div className="form-group">
              <label className="form-label">Geos</label>
              <input className="form-input" value={edits.geos}
                onChange={(e) => updateEdit("geos", e.target.value)} placeholder="e.g. IN, US" />
            </div>

            <div className="form-group">
              <label className="form-label">Revenue</label>
              <input className="form-input" value={edits.revenue}
                onChange={(e) => updateEdit("revenue", e.target.value)} />
            </div>

            <div className="form-group">
              <label className="form-label">Payout</label>
              <input className="form-input" value={edits.payout}
                onChange={(e) => updateEdit("payout", e.target.value)} />
            </div>

            <div className="form-group">
              <label className="form-label">KPI</label>
              <input className="form-input" value={edits.kpi}
                onChange={(e) => updateEdit("kpi", e.target.value)} />
            </div>

            <div className="form-group">
              <label className="form-label">Validation Terms</label>
              <input className="form-input" value={edits.validation_terms}
                onChange={(e) => updateEdit("validation_terms", e.target.value)} />
            </div>

            <div className="form-group">
              <label className="form-label">Payment Terms</label>
              <input className="form-input" value={edits.payment_terms}
                onChange={(e) => updateEdit("payment_terms", e.target.value)} />
            </div>
          </div>

          {/* Conditional offline report link */}
          {(edits.tracking_type || campaign.tracking_type) === "offline" && (
            <div className="form-group">
              <label className="form-label">Offline Report Link *</label>
              <input
                className="form-input"
                value={edits.offline_report_link}
                onChange={(e) => updateEdit("offline_report_link", e.target.value)}
              />
              {editErrors.offline_report_link && (
                <p className="form-error">{editErrors.offline_report_link}</p>
              )}
            </div>
          )}

          <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginTop: 4 }}>
            <button
              className="btn btn-primary"
              onClick={handleApprove}
              disabled={isBusy}
            >
              {approveMutation.isPending ? "Approving…" : "Confirm Approval"}
            </button>
            <button className="btn btn-secondary" onClick={() => setMode(null)} disabled={isBusy}>
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Reject flow */}
      {mode === "reject" && (
        <div>
          <div className="form-group">
            <label className="form-label">Reason for rejection (optional):</label>
            <textarea
              className="form-input"
              rows={3}
              value={rejectReason}
              onChange={(e) => setRejectReason(e.target.value)}
              placeholder="Explain why this campaign is being rejected…"
              style={{ resize: "vertical" }}
              autoFocus
            />
          </div>
          <div style={{ display: "flex", gap: 8, marginTop: 8, flexWrap: "wrap" }}>
            <button
              onClick={handleReject}
              disabled={isBusy}
              style={{
                padding: "7px 14px", borderRadius: 3, fontSize: 12,
                fontWeight: 600, cursor: isBusy ? "not-allowed" : "pointer",
                fontFamily: "inherit", opacity: isBusy ? 0.7 : 1,
                background: "none", color: "#8A1A1A", border: "1px solid #F0A8A8",
              }}
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
