/**
 * components/advertisers/PublisherForm.jsx
 *
 * Create / Edit Publisher modal — all fields from the onboarding form.
 *
 * Sections:
 *   1. Basic Info     — full_name, company_name, status
 *   2. Contact        — email, mobile, landline
 *   3. Specialization — area_of_specialization (multi-select chips), past_campaigns
 *   4. Location       — region, country, city, address
 *   5. Business / Tax — tax_id, website
 *   6. Bank Details   — account_number, account_name, bank_name,
 *                       branch, ifsc_code, swift_code, upi_id
 *
 * Specialization:
 *   Rendered as clickable chips — click to toggle on/off.
 *   Backend validates against the 14 allowed values.
 *
 * Bank Details:
 *   Shown to all users in the form (Operations/Admin only reach this form).
 *   API hides bank details from Sales in read responses.
 */
import { useState } from "react";
import Modal          from "@/components/common/Modal";
import { useIsMobile } from "@/hooks/useIsMobile";
import { useToast }   from "@/components/common/Toast";
import PhoneInput     from "@/components/common/PhoneInput";
import {
  useCreatePublisher,
  useUpdatePublisher,
  usePublisherChoices,
} from "@/hooks/usePublishers";
import { COMMON_COUNTRIES } from "@/utils/countries";

const EMPTY = {
  full_name:              "",
  company_name:           "",
  status:                 "active",
  email:                  "",
  mobile:                 "",
  landline:               "",
  area_of_specialization: [],
  past_campaigns:         "",
  address:                "",
  region:                 "",
  country:                "IN",
  city:                   "",
  tax_id:                 "",
  website:                "",
  bank_account_number:    "",
  account_name:           "",
  bank_name:              "",
  branch:                 "",
  ifsc_code:              "",
  swift_code:             "",
  upi_id:                 "",
};

function pubToForm(pub) {
  return {
    full_name:              pub.full_name              ?? "",
    company_name:           pub.company_name           ?? "",
    status:                 pub.status                 ?? "active",
    email:                  pub.email                  ?? "",
    mobile:                 pub.mobile                 ?? "",
    landline:               pub.landline               ?? "",
    area_of_specialization: pub.area_of_specialization ?? [],
    past_campaigns:         pub.past_campaigns         ?? "",
    address:                pub.address                ?? "",
    region:                 pub.region                 ?? "",
    country:                pub.country                ?? "IN",
    city:                   pub.city                   ?? "",
    tax_id:                 pub.tax_id                 ?? "",
    website:                pub.website                ?? "",
    bank_account_number:    pub.bank_account_number    ?? "",
    account_name:           pub.account_name           ?? "",
    bank_name:              pub.bank_name              ?? "",
    branch:                 pub.branch                 ?? "",
    ifsc_code:              pub.ifsc_code              ?? "",
    swift_code:             pub.swift_code             ?? "",
    upi_id:                 pub.upi_id                 ?? "",
  };
}

export default function PublisherForm({ publisher = null, onClose, onSaved }) {
  const isEdit = !!publisher;
  const toast  = useToast();

  const [form,   setForm]   = useState(isEdit ? pubToForm(publisher) : EMPTY);
  const [errors, setErrors] = useState({});

  const { data: choices, isLoading: choicesLoading } = usePublisherChoices();
  const createMutation = useCreatePublisher();
  const updateMutation = useUpdatePublisher();

  const set = (k, v) => {
    setForm((f) => ({ ...f, [k]: v }));
    if (errors[k]) setErrors((e) => ({ ...e, [k]: "" }));
  };

  // ── Specialization toggle ─────────────────────────────────────────────────
  const toggleSpec = (value) => {
    const current = form.area_of_specialization;
    const next = current.includes(value)
      ? current.filter((v) => v !== value)
      : [...current, value];
    set("area_of_specialization", next);
  };

  // ── Validation ─────────────────────────────────────────────────────────────
  const validate = () => {
    const e = {};
    if (!form.full_name.trim()) e.full_name = "Company name is required.";
    if (!form.email.trim())     e.email     = "Email is required.";
    else if (!/\S+@\S+\.\S+/.test(form.email)) e.email = "Enter a valid email.";
    if (!form.mobile.trim())    e.mobile    = "Mobile is required.";
    if (!form.region)           e.region    = "Region is required.";
    if (!form.country)          e.country   = "Country is required.";
    if (!form.tax_id.trim())    e.tax_id    = "Tax ID is required.";
    if (form.area_of_specialization.length === 0)
      e.area_of_specialization = "Select at least one specialization.";
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  // ── Submit ─────────────────────────────────────────────────────────────────
  const handleSubmit = async () => {
    if (!validate()) return;

    try {
      if (isEdit) {
        await updateMutation.mutateAsync({ id: publisher.id, data: form });
        toast.success("Publisher updated!");
      } else {
        await createMutation.mutateAsync(form);
        toast.success("Publisher created!");
      }
      onSaved?.();
      onClose();
    } catch (err) {
      const detail = err.response?.data;

      if (typeof detail === "object" && detail !== null && !Array.isArray(detail)) {
        const fieldErrors = {};
        const unmappedErrors = [];

        const fieldMap = {
          specializations: "specializations",
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

  if (choicesLoading) return null;

  const specializations = choices?.specializations ?? [];
  const regions         = choices?.regions         ?? [];
  const statuses        = choices?.statuses        ?? [];

  return (
    <Modal
      open
      onClose={onClose}
      title={isEdit ? "Edit Publisher" : "Add Publisher"}
      subtitle={
        isEdit
          ? `Editing: ${publisher.full_name}`
          : "Register a new publisher partner"
      }
      size="wide"
      footer={
        <div className="modal-footer">
          <button className="btn btn-secondary" onClick={onClose} disabled={isBusy}>
            Cancel
          </button>
          <button className="btn btn-primary" onClick={handleSubmit} disabled={isBusy}>
            {isBusy ? "Saving…" : isEdit ? "Save Changes" : "Create Publisher"}
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
          <Grid template="2fr 2fr 1fr">
            <Field label="Full Name *" error={errors.full_name}>
              <input
                className="form-input"
                value={form.full_name}
                onChange={(e) => set("full_name", e.target.value)}
                placeholder="Publisher contact name"
                autoFocus
              />
            </Field>

            <Field label="Company Name">
              <input
                className="form-input"
                value={form.company_name}
                onChange={(e) => set("company_name", e.target.value)}
                placeholder="Agency or company (if any)"
              />
            </Field>

            <Field label="Status">
              <select
                className="form-select"
                value={form.status}
                onChange={(e) => set("status", e.target.value)}
              >
                {statuses.map((s) => (
                  <option key={s.value} value={s.value}>{s.label}</option>
                ))}
              </select>
            </Field>
          </Grid>
        </Section>

        {/* ── Section 2: Contact ── */}
        <Section title="Contact">
          {/* Email — full width */}
          <Field label="Email ID *" error={errors.email} style={{ marginBottom: 12 }}>
            <input
              className="form-input"
              type="email"
              value={form.email}
              onChange={(e) => set("email", e.target.value)}
              placeholder="publisher@email.com"
              disabled={isEdit}
              style={isEdit ? { opacity: 0.6, cursor: "not-allowed" } : {}}
            />
            {isEdit && (
              <p style={{ fontSize: 10, color: "var(--text3)", marginTop: 2 }}>
                Email cannot be changed after creation.
              </p>
            )}
          </Field>

          {/* Mobile + Landline — 50/50 */}
          <Grid cols={2}>
            <Field label="Mobile *" error={errors.mobile}>
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

        {/* ── Section 3: Specialization (multi-select chips) ── */}
        <Section
          title="Area of Specialization *"
          subtitle="Click to select one or more monetization models"
        >
          {errors.area_of_specialization && (
            <p className="form-error" style={{ marginBottom: 8 }}>
              {errors.area_of_specialization}
            </p>
          )}
          <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
            {specializations.map((spec) => {
              const selected = form.area_of_specialization.includes(spec.value);
              return (
                <button
                  key={spec.value}
                  type="button"
                  onClick={() => toggleSpec(spec.value)}
                  style={{
                    padding:      "5px 12px",
                    borderRadius: 20,
                    border:       `1.5px solid ${selected ? "var(--accent)" : "var(--border2)"}`,
                    background:   selected ? "var(--accent-lt)" : "var(--surface)",
                    color:        selected ? "var(--accent)" : "var(--text3)",
                    fontSize:     11,
                    fontWeight:   selected ? 700 : 500,
                    cursor:       "pointer",
                    fontFamily:   "inherit",
                    transition:   "all 0.12s",
                    userSelect:   "none",
                  }}
                >
                  {selected && "✓ "}{spec.label}
                </button>
              );
            })}
          </div>
          {form.area_of_specialization.length > 0 && (
            <p style={{ fontSize: 10, color: "var(--text3)", marginTop: 6 }}>
              {form.area_of_specialization.length} selected
            </p>
          )}
          <div className="form-group" style={{ marginTop: 12 }}>
            <label className="form-label">Past Campaigns Reference</label>
            <textarea
              className="form-input"
              rows={2}
              value={form.past_campaigns}
              onChange={(e) => set("past_campaigns", e.target.value)}
              placeholder="Previous campaign names or portfolio URL"
              style={{ resize: "vertical" }}
            />
          </div>
        </Section>

        {/* ── Section 5: Location ── */}
        <Section title="Location">
          <Grid cols={3}>
            <Field label="Region *" error={errors.region}>
              <select
                className="form-select"
                value={form.region}
                onChange={(e) => set("region", e.target.value)}
              >
                <option value="">— Select region —</option>
                {regions.map((r) => (
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
                placeholder="e.g. Delhi"
              />
            </Field>

            <Field label="Address" style={{ gridColumn: "1 / -1" }}>
              <textarea
                className="form-input"
                rows={2}
                value={form.address}
                onChange={(e) => set("address", e.target.value)}
                placeholder="Full address"
                style={{ resize: "vertical" }}
              />
            </Field>
          </Grid>
        </Section>

        {/* ── Section 6: Business / Tax ── */}
        <Section title="Business Details">
          <Grid cols={2}>
            <Field label="Tax ID (GST / VAT / PAN) *" error={errors.tax_id}>
              <input
                className="form-input"
                value={form.tax_id}
                onChange={(e) => set("tax_id", e.target.value)}
                placeholder="e.g. ABCDE1234F"
              />
            </Field>

            <Field label="Website">
              <input
                className="form-input"
                value={form.website}
                onChange={(e) => set("website", e.target.value)}
                placeholder="https://publisher-site.com"
              />
            </Field>
          </Grid>
        </Section>

        {/* ── Section 7: Bank Details ── */}
        <Section
          title="Bank Details"
          subtitle="For payment settlement — not visible to Sales team"
        >
          <Grid cols={3}>
            <Field label="Bank Account Number">
              <input
                className="form-input"
                value={form.bank_account_number}
                onChange={(e) => set("bank_account_number", e.target.value)}
                placeholder="Account number"
              />
            </Field>

            <Field label="Account Holder Name">
              <input
                className="form-input"
                value={form.account_name}
                onChange={(e) => set("account_name", e.target.value)}
                placeholder="Name on bank account"
              />
            </Field>

            <Field label="Bank Name">
              <input
                className="form-input"
                value={form.bank_name}
                onChange={(e) => set("bank_name", e.target.value)}
                placeholder="e.g. HDFC Bank"
              />
            </Field>

            <Field label="Branch">
              <input
                className="form-input"
                value={form.branch}
                onChange={(e) => set("branch", e.target.value)}
                placeholder="Branch name"
              />
            </Field>

            <Field label="IFSC Code">
              <input
                className="form-input"
                value={form.ifsc_code}
                onChange={(e) => set("ifsc_code", e.target.value.toUpperCase())}
                placeholder="e.g. HDFC0001234"
              />
            </Field>

            <Field label="SWIFT / BIC Code">
              <input
                className="form-input"
                value={form.swift_code}
                onChange={(e) => set("swift_code", e.target.value.toUpperCase())}
                placeholder="For international transfers"
              />
            </Field>

            <Field label="UPI ID">
              <input
                className="form-input"
                value={form.upi_id}
                onChange={(e) => set("upi_id", e.target.value)}
                placeholder="e.g. name@upi"
              />
            </Field>
          </Grid>

          {/* Bank details note */}
          <div style={{
            marginTop:    10,
            padding:      "8px 12px",
            background:   "#FDF4E0",
            border:       "1px solid #F0D080",
            borderRadius: 3,
            fontSize:     10,
            color:        "#7A4A00",
          }}>
            🔒 Bank details are stored securely and are only visible to Operations team
            and Admin. Sales team cannot see these fields.
          </div>
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
          fontSize: 11, fontWeight: 700, textTransform: "uppercase",
          letterSpacing: "0.08em", color: "var(--accent)",
          marginBottom: subtitle ? 2 : 0,
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

function Grid({ cols = 2, template, children }) {
  const isMobile = useIsMobile();
  return (
    <div style={{
      display: "grid",
      gridTemplateColumns: isMobile ? "1fr" : (template ?? `repeat(${cols}, 1fr)`),
      gap: 12,
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