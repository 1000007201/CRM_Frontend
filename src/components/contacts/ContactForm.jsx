/**
 * components/contacts/ContactForm.jsx
 *
 * Create / Edit Contact modal.
 *
 * Fields: name, email, phone, designation, advertiser (required), notes
 *
 * Rules:
 *   - Advertiser is mandatory for all users
 *   - In edit mode, only Approver/Admin can change the advertiser
 *   - Pending advertisers show "(Pending)" label in dropdown
 */
import { useState } from "react";
import Modal        from "@/components/common/Modal";
import { useIsMobile } from "@/hooks/useIsMobile";
import { useToast } from "@/components/common/Toast";
import { useAuth }  from "@/hooks/useAuth";
import PhoneInput   from "@/components/common/PhoneInput";
import {
  useCreateContact,
  useUpdateContact,
  useMyAdvertisersForContact,
} from "@/hooks/useContacts";

const EMPTY = {
  name:        "",
  email:       "",
  phone:       "",
  designation: "",
  linkedin:    "",
  whatsapp:    "",
  telegram:    "",
  teams_id:    "",
  advertiser:  "",
  notes:       "",
};

function contactToForm(c) {
  return {
    name:        c.name        ?? "",
    email:       c.email       ?? "",
    phone:       c.phone       ?? "",
    designation: c.designation ?? "",
    linkedin:    c.linkedin    ?? "",
    whatsapp:    c.whatsapp    ?? "",
    telegram:    c.telegram    ?? "",
    teams_id:    c.teams_id    ?? "",
    advertiser:  c.advertiser  ?? "",
    notes:       c.notes       ?? "",
  };
}

export default function ContactForm({
  contact           = null,
  defaultAdvertiser = null,
  onClose,
  onSaved,
}) {
  const isEdit = !!contact;
  const toast  = useToast();
  const { user: currentUser } = useAuth();

  const isApproverOrAdmin = currentUser?.role === "admin" || currentUser?.is_mis_approver;
  const advertiserLocked  = isEdit && !isApproverOrAdmin;

  const initial = isEdit
    ? contactToForm(contact)
    : { ...EMPTY, advertiser: defaultAdvertiser ?? "" };

  const [form,   setForm]   = useState(initial);
  const [errors, setErrors] = useState({});

  const { data: advertisers = [] } = useMyAdvertisersForContact();

  const createMutation = useCreateContact();
  const updateMutation = useUpdateContact();

  const set = (k, v) => {
    setForm((f) => ({ ...f, [k]: v }));
    if (errors[k]) setErrors((e) => ({ ...e, [k]: "" }));
  };

  const validate = () => {
    const e = {};
    if (!form.name.trim())  e.name       = "Name is required.";
    if (!form.advertiser)   e.advertiser = "Advertiser is required.";
    if (form.email && !/\S+@\S+\.\S+/.test(form.email)) e.email = "Enter a valid email.";
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleSubmit = async () => {
    if (!validate()) return;

    const payload = { ...form };
    Object.keys(payload).forEach((k) => {
      if (payload[k] === "") delete payload[k];
    });
    // Always keep name and advertiser even if somehow empty after trim
    if (form.name)       payload.name       = form.name.trim();
    if (form.advertiser) payload.advertiser = form.advertiser;

    try {
      if (isEdit) {
        await updateMutation.mutateAsync({ id: contact.id, data: payload });
        toast.success("Contact updated!");
      } else {
        await createMutation.mutateAsync(payload);
        toast.success("Contact created!");
      }
      onSaved?.();
      onClose();
    } catch (err) {
      const detail = err.response?.data;

      if (typeof detail === "object" && detail !== null && !Array.isArray(detail)) {
        const fieldErrors   = {};
        const unmappedErrors = [];

        const fieldMap = {
          advertiser_detail: "advertiser",
          non_field_errors:  "_general",
          detail:            "_general",
        };

        Object.entries(detail).forEach(([key, value]) => {
          const message  = Array.isArray(value) ? String(value[0]) : String(value);
          const formField = fieldMap[key] || key;
          if (formField === "_general") unmappedErrors.push(message);
          else fieldErrors[formField] = message;
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

  return (
    <Modal
      open
      onClose={onClose}
      title={isEdit ? "Edit Contact" : "Add Contact"}
      subtitle={isEdit ? `Editing: ${contact.name}` : "Create a new contact record"}
      footer={
        <div className="modal-footer">
          <button className="btn btn-secondary" onClick={onClose} disabled={isBusy}>
            Cancel
          </button>
          <button className="btn btn-primary" onClick={handleSubmit} disabled={isBusy}>
            {isBusy ? "Saving…" : isEdit ? "Save Changes" : "Create Contact"}
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

        {/* Contact Details */}
        <Section title="Contact Details">
          <Grid cols={2}>
            <Field label="Name *" error={errors.name}>
              <input
                className="form-input"
                value={form.name}
                onChange={(e) => set("name", e.target.value)}
                placeholder="Full name"
                autoFocus
              />
            </Field>

            <Field label="Designation">
              <input
                className="form-input"
                value={form.designation}
                onChange={(e) => set("designation", e.target.value)}
                placeholder="e.g. Marketing Manager"
              />
            </Field>

            <Field label="Email" error={errors.email}>
              <input
                className="form-input"
                type="email"
                value={form.email}
                onChange={(e) => set("email", e.target.value)}
                placeholder="contact@company.com"
              />
            </Field>

            <Field label="Phone">
              <PhoneInput
                value={form.phone}
                onChange={(v) => set("phone", v)}
                placeholder="00000 00000"
              />
            </Field>
          </Grid>
        </Section>

        {/* Online Presence */}
        <Section title="Online Presence">
          <Grid cols={2}>
            <Field label="LinkedIn">
              <input
                className="form-input"
                value={form.linkedin}
                onChange={(e) => set("linkedin", e.target.value)}
                placeholder="https://linkedin.com/in/username"
              />
            </Field>

            <Field label="WhatsApp">
              <PhoneInput
                value={form.whatsapp}
                onChange={(v) => set("whatsapp", v)}
                placeholder="00000 00000"
              />
            </Field>

            <Field label="Telegram">
              <input
                className="form-input"
                value={form.telegram}
                onChange={(e) => set("telegram", e.target.value)}
                placeholder="@username"
              />
            </Field>

            <Field label="Teams ID">
              <input
                className="form-input"
                value={form.teams_id}
                onChange={(e) => set("teams_id", e.target.value)}
                placeholder="user@company.com"
              />
            </Field>
          </Grid>
        </Section>

        {/* Advertiser — mandatory for all, locked in edit for non-approver */}
        <Section title="Advertiser">
          <Field label="Advertiser *" error={errors.advertiser}>
            <select
              className="form-select"
              value={form.advertiser}
              onChange={(e) => set("advertiser", e.target.value)}
              disabled={advertiserLocked}
              style={advertiserLocked ? { opacity: 0.6, cursor: "not-allowed" } : {}}
            >
              <option value="" disabled>— Select advertiser —</option>
              {advertisers.map((a) => (
                <option key={a.id} value={a.id}>
                  {a.full_name}{a.status === "pending" ? " (Pending)" : ""}
                </option>
              ))}
            </select>
            {advertiserLocked && (
              <p style={{ fontSize: 11, color: "var(--text3)", marginTop: 4 }}>
                Only Approver/Admin can change the advertiser of an existing contact.
              </p>
            )}
            {advertisers.length === 0 && !advertiserLocked && (
              <p style={{ fontSize: 11, color: "var(--text3)", marginTop: 4 }}>
                You don't manage any advertisers yet. Create an advertiser first to attach contacts.
              </p>
            )}
          </Field>
        </Section>

        {/* Notes */}
        <Section title="Notes">
          <Grid cols={1}>
            <Field label="Notes">
              <textarea
                className="form-input"
                rows={3}
                value={form.notes}
                onChange={(e) => set("notes", e.target.value)}
                placeholder="Any additional notes…"
                style={{ resize: "vertical" }}
              />
            </Field>
          </Grid>
        </Section>

      </div>
    </Modal>
  );
}

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
        {subtitle && <p style={{ fontSize: 10, color: "var(--text3)" }}>{subtitle}</p>}
      </div>
      {children}
    </div>
  );
}

function Grid({ cols = 2, children }) {
  const isMobile = useIsMobile();
  return (
    <div style={{
      display: "grid",
      gridTemplateColumns: isMobile ? "1fr" : `repeat(${cols}, 1fr)`,
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
