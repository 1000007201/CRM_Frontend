/**
 * components/campaigns/CampaignForm.jsx
 *
 * Create / Edit Campaign — category-driven field sections.
 *
 * Props:
 *   campaign   — existing campaign object for edit, null for create
 *   onSave(payload) — called with form payload; caller performs the API call
 *   onClose    — close the form
 */
import { useState } from "react";
import { useIsMobile } from "@/hooks/useIsMobile";
import { useToast }  from "@/components/common/Toast";
import { useAuth }   from "@/hooks/useAuth";
import { useMyAdvertisersForContact, useContactsForAdvertiser } from "@/hooks/useContacts";
import Autocomplete from "@/components/common/Autocomplete";
import {
  CAMPAIGN_CATEGORIES,
  CAMPAIGN_TYPES,
  TRACKING_TYPES,
  CURRENCIES,
  INFLUENCER_PLATFORMS,
  CLIENT_TYPES,
  PERFORMANCE_CATEGORIES,
} from "@/constants/campaign";

// ── Empty state ───────────────────────────────────────────────────────────────
const EMPTY = {
  name:        "",
  description: "",
  currency:    "",
  advertiser:  "",
  advertiser_poc: "",
  category:    "",
  campaign_type: "",
  tracking_type: "",
  drr: "", geos: "", preview_link: "",
  revenue: "", payout: "", validation_terms: "", payment_terms: "", kpi: "",
  offline_report_link: "", advertiser_panel_link: "",
  s2s_postback: "", tag: "",
  brand_name: "", platform: "", campaign_activity_month: "",
  client_type: "", brand_website_link: "", invoice_amount: "",
  superadme_campaign_name: "",
  reference_name:          "",
  ccn:                     "",
  campaign_id:             "",
};

function campaignToForm(c) {
  return {
    name:               c.name               ?? "",
    description:        c.description        ?? "",
    currency:           c.currency           ?? "",
    advertiser:         (typeof c.advertiser     === "object" && c.advertiser     !== null ? c.advertiser.id     : c.advertiser)     ?? "",
    advertiser_poc:     (typeof c.advertiser_poc === "object" && c.advertiser_poc !== null ? c.advertiser_poc.id : c.advertiser_poc) ?? "",
    category:           c.category           ?? "",
    campaign_type:      c.campaign_type      ?? "",
    tracking_type:      c.tracking_type      ?? "",
    drr:                c.drr                ?? "",
    geos:               c.geos               ?? "",
    preview_link:       c.preview_link       ?? "",
    revenue:            c.revenue            ?? "",
    payout:             c.payout             ?? "",
    validation_terms:   c.validation_terms   ?? "",
    payment_terms:      c.payment_terms      ?? "",
    kpi:                c.kpi                ?? "",
    offline_report_link:    c.offline_report_link    ?? "",
    advertiser_panel_link:  c.advertiser_panel_link  ?? "",
    s2s_postback:       c.s2s_postback       ?? "",
    tag:                c.tag                ?? "",
    brand_name:         c.brand_name         ?? "",
    platform:           c.platform           ?? "",
    campaign_activity_month: c.campaign_activity_month ?? "",
    client_type:        c.client_type        ?? "",
    brand_website_link:      c.brand_website_link      ?? "",
    invoice_amount:          c.invoice_amount          ?? "",
    superadme_campaign_name: c.superadme_campaign_name ?? "",
    reference_name:          c.reference_name          ?? "",
    ccn:                     c.ccn                     ?? "",
    campaign_id:             c.campaign_id             ?? "",
  };
}

// ── Component ─────────────────────────────────────────────────────────────────
export default function CampaignForm({ campaign = null, onSave, onClose }) {
  const isEdit  = !!campaign;
  const toast   = useToast();
  const isMobile = useIsMobile();
  const { user } = useAuth();
  const isApproverOrAdmin = user?.role === "admin" || user?.is_mis_approver === true;

  const initial = isEdit
    ? campaignToForm(campaign)
    : { ...EMPTY };

  const [form, setForm] = useState(initial);
  const [trackingLinks, setTrackingLinks] = useState(
    isEdit && campaign.tracking_links_list?.length
      ? campaign.tracking_links_list.map((l) => l.url)
      : [""]
  );
  const [errors,  setErrors]  = useState({});
  const [isBusy,  setIsBusy]  = useState(false);

  const { data: advertisers = [] } = useMyAdvertisersForContact();
  const { data: pocContacts = [] } = useContactsForAdvertiser(form.advertiser || null);

  const advertiserOptions = advertisers.map((a) => ({
    id:       a.id,
    label:    a.full_name,
    sublabel: a.internal_id
      ? `${a.internal_id}${a.status === "pending" ? " · Pending" : ""}`
      : (a.status === "pending" ? "Pending" : ""),
  }));

  const pocOptions = pocContacts.map((c) => ({
    id:       c.id,
    label:    c.name,
    sublabel: c.internal_id
      ? `${c.internal_id}${c.designation ? ` · ${c.designation}` : ""}`
      : (c.designation || c.email || ""),
  }));

  const set = (k, v) => {
    setForm((f) => {
      const next = { ...f, [k]: v };
      if (k === "advertiser") next.advertiser_poc = "";
      return next;
    });
    if (errors[k]) setErrors((e) => ({ ...e, [k]: "" }));
  };

  // ── Tracking links repeater ───────────────────────────────────────────────
  const addLink    = () => setTrackingLinks((prev) => [...prev, ""]);
  const removeLink = (i) => setTrackingLinks((prev) => prev.filter((_, j) => j !== i));
  const updateLink = (i, v) => setTrackingLinks((prev) => prev.map((u, j) => j === i ? v : u));

  // ── Derived flags ─────────────────────────────────────────────────────────
  const isReTag       = form.category === "retag";
  const isInfluencer  = form.category === "influencer";
  const isPerformance = PERFORMANCE_CATEGORIES.includes(form.category);
  const needsTracking = isReTag || isPerformance;

  // ── Validation ────────────────────────────────────────────────────────────
  const validate = () => {
    const e = {};
    if (!form.name.trim())        e.name          = "Campaign name is required.";
    if (!form.advertiser)         e.advertiser    = "Advertiser is required.";
    if (!form.category)           e.category      = "Campaign category is required.";
    if (!form.campaign_type)      e.campaign_type = "Campaign type is required.";
    if (!form.description.trim()) e.description   = "Description is required.";
    if (!form.currency)           e.currency      = "Currency is required.";
    if (!form.advertiser_poc)     e.advertiser_poc = "Advertiser POC is required.";

    if (isReTag) {
      if (!form.tag.trim()) e.tag = "Tag is required for ReTag campaigns.";
    }

    if (needsTracking) {
      if (!form.tracking_type)             e.tracking_type    = "Tracking type is required.";
      if (!form.drr.trim())                e.drr              = "Daily Run Rate is required.";
      if (!form.geos.trim())               e.geos             = "Geos is required.";
      if (!form.revenue.trim())            e.revenue          = "Revenue is required.";
      if (!form.validation_terms.trim())   e.validation_terms = "Validation terms is required.";
      if (!form.payment_terms.trim())      e.payment_terms    = "Payment terms is required.";
      if (!form.kpi.trim())                e.kpi              = "KPI information is required.";
      if (form.tracking_type === "offline" && !form.offline_report_link.trim()) {
        e.offline_report_link = "Offline report link is required when tracking is Offline.";
      }
      const validLinks = trackingLinks.filter((l) => l.trim());
      if (validLinks.length === 0) e.tracking_links = "At least one tracking link is required.";
    }

    if (isInfluencer) {
      if (!form.brand_name.trim())              e.brand_name              = "Brand name is required.";
      if (!form.platform)                       e.platform                = "Platform is required.";
      if (!form.campaign_activity_month.trim()) e.campaign_activity_month = "Activity month is required.";
      if (!form.brand_website_link.trim())      e.brand_website_link      = "Brand website link is required.";
      if (!form.invoice_amount.trim())          e.invoice_amount          = "Invoice amount is required.";
    }

    if (isEdit && campaign?.status === "active" && isApproverOrAdmin) {
      if (!form.superadme_campaign_name?.trim())
        e.superadme_campaign_name = "Required for approved campaign.";
      if (!form.ccn?.trim())
        e.ccn = "Required for approved campaign.";
      if (!form.reference_name?.trim())
        e.reference_name = "Required for approved campaign.";
    }

    setErrors(e);
    return Object.keys(e).length === 0;
  };

  // ── Submit ────────────────────────────────────────────────────────────────
  const handleSubmit = async () => {
    if (!validate()) return;
    setIsBusy(true);

    const payload = {
      ...form,
      tracking_link_urls: trackingLinks.filter((l) => l.trim()),
    };

    try {
      await onSave(payload);
      toast.success(isEdit ? "Campaign updated." : "Campaign submitted for approval.");
      onClose();
    } catch (err) {
      const detail = err.response?.data;
      if (typeof detail === "object" && detail !== null) {
        const fe = {};
        Object.entries(detail).forEach(([k, v]) => {
          fe[k] = Array.isArray(v) ? v[0] : String(v);
        });
        setErrors(fe);
        const general = fe.detail || fe.non_field_errors;
        if (general) toast.error(String(general));
      } else {
        toast.error("Failed to save campaign.");
      }
    } finally {
      setIsBusy(false);
    }
  };

  const colStyle = {
    display: "grid",
    gridTemplateColumns: isMobile ? "1fr" : "1fr 1fr",
    gap: 12,
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>

      {/* ── Approval-only fields — visible to approver/admin when editing an approved campaign ── */}
      {isApproverOrAdmin && isEdit && campaign?.status === "active" && (
        <div style={{
          padding:      14,
          background:   "#F9F4FF",
          border:       "1px solid #D6BCFF",
          borderRadius: 4,
        }}>
          <div style={{ fontWeight: 700, fontSize: 13, marginBottom: 10, color: "#4A1D85" }}>
            Approval Fields
          </div>
          <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr" : "1fr 1fr", gap: 12 }}>
            <div className="form-group">
              <label className="form-label">SuperAdme Campaign Name *</label>
              <input className="form-input" value={form.superadme_campaign_name}
                onChange={(e) => set("superadme_campaign_name", e.target.value)} />
              {errors.superadme_campaign_name && <p className="form-error">{errors.superadme_campaign_name}</p>}
            </div>
            <div className="form-group">
              <label className="form-label">Campaign Name (CCN) *</label>
              <input className="form-input" value={form.ccn}
                onChange={(e) => set("ccn", e.target.value)} />
              {errors.ccn && <p className="form-error">{errors.ccn}</p>}
            </div>
            <div className="form-group">
              <label className="form-label">Reference Name *</label>
              <input className="form-input" value={form.reference_name}
                onChange={(e) => set("reference_name", e.target.value)} />
              {errors.reference_name && <p className="form-error">{errors.reference_name}</p>}
            </div>
            <div className="form-group">
              <label className="form-label">Campaign ID</label>
              <input className="form-input" value={form.campaign_id}
                onChange={(e) => set("campaign_id", e.target.value)} />
            </div>
          </div>
        </div>
      )}

      {/* ── Advertiser + POC — shown first ── */}
      <Section title="Advertiser">
        <div style={colStyle}>
          <Field label="Advertiser *" error={errors.advertiser}>
            <Autocomplete
              options={advertiserOptions}
              value={form.advertiser}
              onChange={(id) => set("advertiser", id || "")}
              placeholder="Type to search advertisers, or click to see all"
              emptyMessage="No advertisers match — try a different search."
            />
          </Field>

          <Field label="Advertiser POC *" error={errors.advertiser_poc}>
            <Autocomplete
              options={pocOptions}
              value={form.advertiser_poc}
              onChange={(id) => set("advertiser_poc", id || "")}
              placeholder={form.advertiser ? "Type to search POCs" : "Select an advertiser first"}
              disabled={!form.advertiser}
              emptyMessage={
                form.advertiser
                  ? "No contacts found on this advertiser."
                  : "Select an advertiser first."
              }
            />
            {!form.advertiser && (
              <p style={{ fontSize: 11, color: "var(--text3)", marginTop: 4 }}>
                Select an advertiser first to choose a POC.
              </p>
            )}
            {form.advertiser && pocContacts.length === 0 && (
              <p style={{ fontSize: 11, color: "var(--text3)", marginTop: 4 }}>
                You have no contacts on this advertiser. Add a contact first.
              </p>
            )}
          </Field>
        </div>
      </Section>

      {/* ── Core fields ── */}
      <Section title="Campaign Info">
        <div style={colStyle}>
          <Field label="Campaign Name *" error={errors.name}>
            <input className="form-input" value={form.name}
              onChange={(e) => set("name", e.target.value)} placeholder="Enter campaign name" />
          </Field>

          <Field label="Currency *" error={errors.currency}>
            <select className="form-select" value={form.currency}
              onChange={(e) => set("currency", e.target.value)}>
              <option value="" disabled>— Select currency —</option>
              {CURRENCIES.map((c) => (
                <option key={c.value} value={c.value}>{c.label}</option>
              ))}
            </select>
          </Field>

          <Field label="Campaign Category *" error={errors.category}>
            <select className="form-select" value={form.category}
              onChange={(e) => set("category", e.target.value)}>
              <option value="" disabled>— Select category —</option>
              {CAMPAIGN_CATEGORIES.map((c) => (
                <option key={c.value} value={c.value}>{c.label}</option>
              ))}
            </select>
          </Field>

          <Field label="Campaign Type *" error={errors.campaign_type}>
            <select className="form-select" value={form.campaign_type}
              onChange={(e) => set("campaign_type", e.target.value)}>
              <option value="" disabled>— Select type —</option>
              {CAMPAIGN_TYPES.map((t) => (
                <option key={t.value} value={t.value}>{t.label}</option>
              ))}
            </select>
          </Field>
        </div>

        <Field label="Campaign Description *" error={errors.description} style={{ marginTop: 12 }}>
          <textarea className="form-input" rows={3} value={form.description}
            onChange={(e) => set("description", e.target.value)}
            placeholder="Describe the campaign…" style={{ resize: "vertical" }} />
        </Field>
      </Section>

      {/* ── ReTag-specific ── */}
      {isReTag && (
        <Section title="ReTag Details">
          <div style={colStyle}>
            <Field label="Tag *" error={errors.tag}>
              <input className="form-input" value={form.tag}
                onChange={(e) => set("tag", e.target.value)}
                placeholder="Tracking tag value" />
            </Field>

            <Field label="S2S Postback">
              <input className="form-input" value={form.s2s_postback}
                onChange={(e) => set("s2s_postback", e.target.value)}
                placeholder="S2S postback URL" />
            </Field>
          </div>
        </Section>
      )}

      {/* ── Performance + ReTag shared fields ── */}
      {needsTracking && (
        <Section title="Performance Details">
          <div style={colStyle}>
            <Field label="Tracking *" error={errors.tracking_type}>
              <select className="form-select" value={form.tracking_type}
                onChange={(e) => set("tracking_type", e.target.value)}>
                <option value="" disabled>— Select —</option>
                {TRACKING_TYPES.map((t) => (
                  <option key={t.value} value={t.value}>{t.label}</option>
                ))}
              </select>
            </Field>

            <Field label="Daily Run Rate (DRR) *" error={errors.drr}>
              <input className="form-input" value={form.drr}
                onChange={(e) => set("drr", e.target.value)}
                placeholder="e.g. 500" />
            </Field>

            <Field label="Geos *" error={errors.geos}>
              <input className="form-input" value={form.geos}
                onChange={(e) => set("geos", e.target.value)}
                placeholder="e.g. IN, US, UK" />
            </Field>

            <Field label="Revenue *" error={errors.revenue}>
              <input className="form-input" value={form.revenue}
                onChange={(e) => set("revenue", e.target.value)}
                placeholder="e.g. $5 per install" />
            </Field>

            <Field label="Payout" error={errors.payout}>
              <input className="form-input" value={form.payout}
                onChange={(e) => set("payout", e.target.value)}
                placeholder="e.g. $4 per install (your cost)" />
            </Field>

            <Field label="Validation Terms *" error={errors.validation_terms}>
              <input className="form-input" value={form.validation_terms}
                onChange={(e) => set("validation_terms", e.target.value)}
                placeholder="e.g. 30 Days" />
            </Field>

            <Field label="Payment Terms *" error={errors.payment_terms}>
              <input className="form-input" value={form.payment_terms}
                onChange={(e) => set("payment_terms", e.target.value)} />
            </Field>

            <Field label="Preview Link">
              <input className="form-input" value={form.preview_link}
                onChange={(e) => set("preview_link", e.target.value)}
                placeholder="https://…" />
            </Field>

            {form.tracking_type === "offline" && (
              <Field label="Offline Report Link *" error={errors.offline_report_link}>
                <input className="form-input" value={form.offline_report_link}
                  onChange={(e) => set("offline_report_link", e.target.value)}
                  placeholder="https://…" />
              </Field>
            )}

            <Field label="Advertiser Panel Link">
              <input className="form-input" value={form.advertiser_panel_link}
                onChange={(e) => set("advertiser_panel_link", e.target.value)}
                placeholder="https://…" />
            </Field>
          </div>

          <Field label="KPI Information *" error={errors.kpi} style={{ marginTop: 12 }}>
            <textarea className="form-input" rows={2} value={form.kpi}
              onChange={(e) => set("kpi", e.target.value)}
              placeholder="Key performance indicators…" style={{ resize: "vertical" }} />
          </Field>

          {/* Tracking links repeater */}
          <div className="form-group" style={{ marginTop: 12 }}>
            <label className="form-label">Tracking Links *</label>
            {trackingLinks.map((url, i) => (
              <div key={i} style={{ display: "flex", gap: 6, marginBottom: 6 }}>
                <input
                  className="form-input"
                  value={url}
                  onChange={(e) => updateLink(i, e.target.value)}
                  placeholder="https://tracking.example.com/…"
                  style={{ flex: 1 }}
                />
                {trackingLinks.length > 1 && (
                  <button type="button" onClick={() => removeLink(i)}
                    style={{
                      padding: "0 10px", border: "1px solid #F0A8A8",
                      background: "#FCE8E8", color: "#C03030", borderRadius: 3,
                      fontSize: 11, cursor: "pointer", whiteSpace: "nowrap", fontFamily: "inherit",
                    }}>
                    Remove
                  </button>
                )}
              </div>
            ))}
            <button type="button" onClick={addLink}
              className="btn btn-secondary btn-sm" style={{ marginTop: 4 }}>
              + Add Another Link
            </button>
            {errors.tracking_links && <p className="form-error">{errors.tracking_links}</p>}
          </div>
        </Section>
      )}

      {/* ── Influencer-specific ── */}
      {isInfluencer && (
        <Section title="Influencer Details">
          <div style={colStyle}>
            <Field label="Brand Name *" error={errors.brand_name}>
              <input className="form-input" value={form.brand_name}
                onChange={(e) => set("brand_name", e.target.value)} />
            </Field>

            <Field label="Platform *" error={errors.platform}>
              <select className="form-select" value={form.platform}
                onChange={(e) => set("platform", e.target.value)}>
                <option value="" disabled>— Select platform —</option>
                {INFLUENCER_PLATFORMS.map((p) => (
                  <option key={p.value} value={p.value}>{p.label}</option>
                ))}
              </select>
            </Field>

            <Field label="Campaign Activity Month *" error={errors.campaign_activity_month}>
              <input className="form-input" value={form.campaign_activity_month}
                onChange={(e) => set("campaign_activity_month", e.target.value)}
                placeholder="e.g. Mar/26" />
            </Field>

            <Field label="Client Type">
              <select className="form-select" value={form.client_type}
                onChange={(e) => set("client_type", e.target.value)}>
                <option value="">— Select —</option>
                {CLIENT_TYPES.map((c) => (
                  <option key={c.value} value={c.value}>{c.label}</option>
                ))}
              </select>
            </Field>

            <Field label="Brand Website Link *" error={errors.brand_website_link}>
              <input className="form-input" value={form.brand_website_link}
                onChange={(e) => set("brand_website_link", e.target.value)}
                placeholder="https://…" />
            </Field>

            <Field label="Invoice Amount *" error={errors.invoice_amount}>
              <input className="form-input" value={form.invoice_amount}
                onChange={(e) => set("invoice_amount", e.target.value)}
                placeholder="e.g. 50000" />
            </Field>
          </div>
        </Section>
      )}

      {/* ── Actions ── */}
      <div style={{ display: "flex", gap: 10, marginTop: 4 }}>
        <button onClick={handleSubmit} className="btn btn-primary" disabled={isBusy}
          style={{ flex: 1 }}>
          {isBusy ? "Saving…" : isEdit ? "Save Changes" : "Submit for Approval"}
        </button>
        <button onClick={onClose} className="btn btn-secondary" disabled={isBusy}>
          Cancel
        </button>
      </div>
    </div>
  );
}

// ── Layout helpers ────────────────────────────────────────────────────────────
function Section({ title, children }) {
  return (
    <div>
      <p style={{
        fontSize: 11, fontWeight: 700, textTransform: "uppercase",
        letterSpacing: "0.08em", color: "var(--accent)", marginBottom: 10,
      }}>
        {title}
      </p>
      {children}
    </div>
  );
}

function Field({ label, error, children, style = {} }) {
  return (
    <div className="form-group" style={style}>
      <label className="form-label">{label}</label>
      {children}
      {error && <p className="form-error">{error}</p>}
    </div>
  );
}
