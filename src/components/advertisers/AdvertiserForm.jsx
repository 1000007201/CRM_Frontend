/**
 * components/advertisers/AdvertiserForm.jsx
 *
 * Create / Edit Advertiser modal.
 *
 * Sections:
 *   1. Basic Info     — full_name, type
 *   2. Contact Details — email, mobile, landline
 *   3. Location       — region, country, city
 *   4. Business       — website, billing_address, billing_entity, tax_id
 *
 * Access: Operations team + Admin only (enforced by backend, not frontend)
 */
import { useState } from "react";
import Modal        from "@/components/common/Modal";
import { useIsMobile } from "@/hooks/useIsMobile";
import Spinner      from "@/components/common/Spinner";
import { useToast } from "@/components/common/Toast";
import { useAuth }  from "@/hooks/useAuth";
import PhoneInput   from "@/components/common/PhoneInput";
import {
  useCreateAdvertiser,
  useUpdateAdvertiser,
  useAdvertiserChoices,
} from "@/hooks/useAdvertisers";
import { COMMON_COUNTRIES } from "@/utils/countries";
import { REGIONS } from "@/constants/regions";

const EMPTY = {
  full_name:       "",
  type:            "",
  email:           "",
  mobile:          "",
  landline:        "",
  region:          "",
  country:         "",
  city:            "",
  website:         "",
  billing_address: "",
  billing_entity:  "",
  tax_id:          "",
};


function advToForm(adv) {
  return {
    full_name:       adv.full_name       ?? "",
    type:            adv.type            ?? "",
    email:           adv.email           ?? "",
    mobile:          adv.mobile          ?? "",
    landline:        adv.landline        ?? "",
    region:          adv.region          ?? "",
    country:         adv.country         ?? "",
    city:            adv.city            ?? "",
    website:         adv.website         ?? "",
    billing_address: adv.billing_address ?? "",
    billing_entity:  adv.billing_entity  ?? "",
    tax_id:          adv.tax_id          ?? "",
  };
}

export default function AdvertiserForm({ advertiser = null, onClose, onSaved }) {
  const isEdit = !!advertiser;
  const toast  = useToast();
  const { user } = useAuth();

  const isApproverOrAdmin = user?.role === "admin" || user?.is_mis_approver;

  const [form,   setForm]   = useState(isEdit ? advToForm(advertiser) : EMPTY);
  const [errors, setErrors] = useState({});

  const { data: choices, isLoading: choicesLoading } = useAdvertiserChoices();
  const createMutation = useCreateAdvertiser();
  const updateMutation = useUpdateAdvertiser();

  const set = (k, v) => {
    setForm((f) => ({ ...f, [k]: v }));
    if (errors[k]) setErrors((e) => ({ ...e, [k]: "" }));
  };

  // ── Validation ─────────────────────────────────────────────────────────────
  const validate = () => {
    const e = {};
    if (!form.full_name.trim())       e.full_name       = "Company name is required.";
    if (!form.type)                   e.type            = "Type is required.";
    if (form.email && !/\S+@\S+\.\S+/.test(form.email)) e.email = "Enter a valid email.";
    if (!form.country)                e.country         = "Country is required.";
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  // ── Submit ─────────────────────────────────────────────────────────────────
  const handleSubmit = async () => {
    if (!validate()) return;

    const payload = { ...form };

    try {
      if (isEdit) {
        await updateMutation.mutateAsync({ id: advertiser.id, data: payload });
        toast.success("Advertiser updated!");
      } else {
        await createMutation.mutateAsync(payload);
        toast.success("Advertiser submitted for approval!");
      }
      onSaved?.();
      onClose();
    } catch (err) {
      const detail = err.response?.data;

      if (typeof detail === "object" && detail !== null && !Array.isArray(detail)) {
        const fieldErrors = {};
        const unmappedErrors = [];

        const fieldMap = {
          non_field_errors: "_general",
          detail:           "_general",
        };

        Object.entries(detail).forEach(([key, value]) => {
          const message = Array.isArray(value) ? String(value[0]) : String(value);
          const formField = fieldMap[key] || key;
          if (formField === "_general") {
            unmappedErrors.push(message);
          } else {
            fieldErrors[formField] = message;
          }
        });

        setErrors(fieldErrors);
        if (unmappedErrors.length > 0) toast.error(unmappedErrors.join(" "));
      } else if (typeof detail === "string") {
        toast.error(detail);
      } else {
        toast.error("Something went wrong. Please try again.");
      }
    }
  };

  const isBusy = createMutation.isPending || updateMutation.isPending;

  const buttonLabel = isBusy
    ? "Saving…"
    : isEdit
    ? "Save Changes"
    : isApproverOrAdmin ? "Create Advertiser" : "Submit for Approval";

  if (choicesLoading) return null;

  const types = choices?.types ?? [];

  return (
    <Modal
      open
      onClose={onClose}
      title={isEdit ? "Edit Advertiser" : "Add Advertiser"}
      subtitle={
        isEdit
          ? `Editing: ${advertiser.full_name}`
          : "Register a new advertiser account"
      }
      size="wide"
      footer={
        <div className="modal-footer">
          <button className="btn btn-secondary" onClick={onClose} disabled={isBusy}>
            Cancel
          </button>
          <button className="btn btn-primary" onClick={handleSubmit} disabled={isBusy}>
            {buttonLabel}
          </button>
        </div>
      }
    >
      <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
        {errors._general && (
          <div style={{
            padding:    "10px 12px",
            background: "#FEE2E2",
            border:     "1px solid #FCA5A5",
            borderRadius: 3,
            color:      "#991B1B",
            fontSize:   13,
          }}>
            {errors._general}
          </div>
        )}

        {/* ── Section 1: Basic Info ── */}
        <Section title="Basic Information">
          <Grid cols={2}>
            <Field label="Company Name *" error={errors.full_name}>
              <input
                className="form-input"
                value={form.full_name}
                onChange={(e) => set("full_name", e.target.value)}
                placeholder="Enter company name"
                autoFocus
              />
            </Field>

            <Field label="Type *" error={errors.type}>
              <select
                className="form-select"
                value={form.type}
                onChange={(e) => set("type", e.target.value)}
              >
                <option value="">— Select type —</option>
                {types.map((t) => (
                  <option key={t.value} value={t.value}>{t.label}</option>
                ))}
              </select>
            </Field>
          </Grid>
        </Section>

        {/* ── Section 2: Contact Details ── */}
        <Section title="Contact Details">
          <Grid cols={2}>
            <Field label="Email ID" error={errors.email}>
              <input
                className="form-input"
                type="email"
                value={form.email}
                onChange={(e) => set("email", e.target.value)}
                placeholder="contact@company.com"
                disabled={isEdit}
                style={isEdit ? { opacity: 0.6, cursor: "not-allowed" } : {}}
              />
              {isEdit && (
                <p style={{ fontSize: 10, color: "var(--text3)", marginTop: 2 }}>
                  Email cannot be changed after creation.
                </p>
              )}
            </Field>

            <Field label="Mobile" error={errors.mobile}>
              <PhoneInput
                value={form.mobile}
                onChange={(v) => set("mobile", v)}
                placeholder="00000 00000"
              />
            </Field>

            <Field label="Landline">
              <PhoneInput
                value={form.landline}
                onChange={(v) => set("landline", v)}
                placeholder="00000 00000"
              />
            </Field>
          </Grid>
        </Section>

        {/* ── Section 3: Location ── */}
        <Section title="Location">
          <Grid cols={3}>
            <Field label="Region" error={errors.region}>
              <select
                className="form-select"
                value={form.region || ""}
                onChange={(e) => set("region", e.target.value)}
              >
                <option value="">— Select region —</option>
                {REGIONS.map((r) => (
                  <option key={r.value} value={r.value}>{r.label}</option>
                ))}
              </select>
            </Field>

            <Field label="Country *" error={errors.country}>
              <select
                className="form-select"
                value={form.country}
                onChange={(e) => set("country", e.target.value)}
              >
                <option value="">— Select country —</option>
                {COMMON_COUNTRIES.map((c) => (
                  <option key={c.code} value={c.code}>{c.name}</option>
                ))}
              </select>
            </Field>

            <Field label="City">
              <input
                className="form-input"
                value={form.city}
                onChange={(e) => set("city", e.target.value)}
                placeholder="e.g. Mumbai"
              />
            </Field>
          </Grid>
        </Section>

        {/* ── Section 4: Business Details ── */}
        <Section title="Business Details">
          <Grid cols={2}>
            <Field label="Website">
              <input
                className="form-input"
                value={form.website}
                onChange={(e) => set("website", e.target.value)}
                placeholder="https://company.com"
              />
            </Field>

            <Field label="Tax ID (GST / VAT)">
              <input
                className="form-input"
                value={form.tax_id}
                onChange={(e) => set("tax_id", e.target.value)}
                placeholder="e.g. 22AAAAA0000A1Z5"
              />
            </Field>

            <Field label="Billing Entity Name" error={errors.billing_entity}>
              <input
                className="form-input"
                value={form.billing_entity}
                onChange={(e) => set("billing_entity", e.target.value)}
                placeholder="Legal entity name for invoices"
              />
            </Field>

            <Field
              label="Billing Address"
              error={errors.billing_address}
              style={{ gridColumn: "1 / -1" }}
            >
              <textarea
                className="form-input"
                rows={3}
                value={form.billing_address}
                onChange={(e) => set("billing_address", e.target.value)}
                placeholder="Full billing address"
                style={{ resize: "vertical" }}
              />
            </Field>
          </Grid>
        </Section>

      </div>
    </Modal>
  );
}

// ── Layout helpers ─────────────────────────────────────────────────────────────

function Section({ title, subtitle, children }) {
  return (
    <div>
      <div style={{ marginBottom: 10 }}>
        <p style={{
          fontSize:      11,
          fontWeight:    700,
          textTransform: "uppercase",
          letterSpacing: "0.08em",
          color:         "var(--accent)",
          marginBottom:  subtitle ? 2 : 0,
        }}>
          {title}
        </p>
        {subtitle && (
          <p style={{ fontSize: 10, color: "var(--text3)" }}>{subtitle}</p>
        )}
      </div>
      {children}
    </div>
  );
}

function Grid({ cols = 2, children }) {
  const isMobile = useIsMobile();
  return (
    <div style={{
      display:             "grid",
      gridTemplateColumns: isMobile ? "1fr" : `repeat(${cols}, 1fr)`,
      gap:                 12,
    }}>
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