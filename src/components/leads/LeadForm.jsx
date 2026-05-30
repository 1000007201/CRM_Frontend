/**
 * components/leads/LeadForm.jsx
 *
 * Used for both creating and editing a lead.
 * Props:
 *   lead     — existing lead object (edit mode) or null (create mode)
 *   onClose  — called when the modal should close
 *   onSaved  — called with the saved lead after success
 */
import { useState } from "react";
import Modal from "@/components/common/Modal";
import { useToast } from "@/components/common/Toast";
import { useCreateLead, useUpdateLead } from "@/hooks/useLeads";
import { isAdminOrManager } from "@/utils/roles";
import { useAuth } from "@/hooks/useAuth";
import { useTeam } from "@/hooks/useUsers";
import { PRIORITY_META } from "@/utils/formatters";
import PhoneInput from "@/components/common/PhoneInput";

// ── Lead form constants ───────────────────────────────────────────────────────
const STAGES = [
  { value: "raw",               label: "Raw" },
  { value: "new",               label: "New" },
  { value: "contact_attempted", label: "Contact Attempted" },
  { value: "connected",         label: "Connected" },
  { value: "no_response",       label: "No Response" },
  { value: "meeting_scheduled", label: "Meeting Scheduled" },
  { value: "converted",         label: "Converted" },
  { value: "lost",              label: "Lost" },
];

// Raw is bulk-upload only — not available in manual create/edit form
const MANUAL_STAGES = STAGES.filter((s) => s.value !== "raw");

const SOURCES = [
  { value: "linkedin",          label: "LinkedIn" },
  { value: "referral",          label: "Referral" },
  { value: "event_conference",  label: "Event/Conference" },
  { value: "network",           label: "Network" },
];

const PRIORITIES = Object.keys(PRIORITY_META);

const EMPTY_FORM = {
  contact_name:  "",
  contact_email: "",
  contact_phone: "",
  company:       "",
  website:       "",
  stage:         "",
  source:        "",
  priority:      "",
  description:   "",
  tag_name:      "",
  assigned_to:   "",
};

function leadToForm(lead) {
  return {
    contact_name:  lead.contact_name     ?? "",
    contact_email: lead.contact_email    ?? "",
    contact_phone: lead.contact_phone    ?? "",
    company:       lead.company          ?? "",
    website:       lead.website          ?? "",
    stage:         lead.stage            ?? "raw",
    source:        lead.source           ?? "",
    priority:      lead.priority         ?? "medium",
    description:   lead.description      ?? "",
    tag_name:      lead.tag_detail?.name ?? "",
    assigned_to:   lead.assigned_to      ?? "",
  };
}

export default function LeadForm({ lead = null, onClose, onSaved }) {
  const isEdit = !!lead;
  const toast  = useToast();
  const { user } = useAuth();
  const canAssign = isAdminOrManager(user);

  const { data: team = [] } = useTeam();
  const createMutation = useCreateLead();
  const updateMutation = useUpdateLead();

  const [form,   setForm]   = useState(isEdit ? leadToForm(lead) : EMPTY_FORM);
  const [errors, setErrors] = useState({});

  const set = (key, val) => {
    setForm((f) => ({ ...f, [key]: val }));
    if (errors[key]) setErrors((e) => ({ ...e, [key]: "" }));
  };

  const needsTag = form.source === "event_conference" || form.source === "network";

  const visibleStages = user?.role === "admin" ? STAGES : MANUAL_STAGES;

  const teamManagers = [...team]
    .filter((r) => r.role === "manager")
    .sort((a, b) => a.full_name.localeCompare(b.full_name));
  const teamMembers = [...team]
    .filter((r) => r.role !== "manager")
    .sort((a, b) => a.full_name.localeCompare(b.full_name));

  // ── Validation ──────────────────────────────────────────────────────────
  const validate = () => {
    const e = {};

    // Company OR contact name required
    if (!form.company?.trim() && !form.contact_name?.trim()) {
      e.company = "Either Company or Contact Name is required.";
    }

    if (!form.stage)    e.stage    = "Stage is required.";
    if (!form.priority) e.priority = "Priority is required.";

    // Source required
    if (!form.source) {
      e.source = "Source is required.";
    }

    // Tag required for specific sources
    if (
      (form.source === "event_conference" || form.source === "network") &&
      !form.tag_name?.trim()
    ) {
      e.tag_name = form.source === "event_conference"
        ? "Event/Conference name is required."
        : "Network name is required.";
    }

    if (form.contact_email && !/\S+@\S+\.\S+/.test(form.contact_email)) {
      e.contact_email = "Enter a valid email address.";
    }
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  // ── Submit ──────────────────────────────────────────────────────────────
  const handleSubmit = async () => {
    if (!validate()) return;

    const payload = {
      ...form,
      assigned_to: form.stage === "raw" ? null : (form.assigned_to || null),
    };

    // Strip tag_name unless source needs it (backend creates/links Tag)
    if (!needsTag) {
      delete payload.tag_name;
    } else {
      payload.tag_name = form.tag_name.trim();
    }

    // SalesEmployee can't set assigned_to
    if (!canAssign) delete payload.assigned_to;

    try {
      let saved;
      if (isEdit) {
        // Remove stage from update payload — use /stage/ endpoint instead
        const { stage, assigned_to, ...updatePayload } = payload;
        saved = await updateMutation.mutateAsync({ id: lead.id, data: updatePayload });
      } else {
        saved = await createMutation.mutateAsync(payload);
      }
      toast.success(isEdit ? "Lead updated!" : "Lead created!");
      onSaved?.(saved);
      onClose();
    } catch (err) {
      const detail = err.response?.data;

      if (typeof detail === "object" && detail !== null && !Array.isArray(detail)) {
        const fieldErrors = {};
        const unmappedErrors = [];

        const fieldMap = {
          tag:              "tag_name",
          tag_detail:       "tag_name",
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

  return (
    <Modal
      open
      onClose={onClose}
      title={isEdit ? "Edit Lead" : "Add New Lead"}
      subtitle={isEdit
        ? `Editing: ${lead.contact_name || lead.company || "Lead"}`
        : "Fill in the details to create a new lead"}
      size="wide"
      footer={
        <div className="modal-footer">
          <button className="btn btn-secondary" onClick={onClose} disabled={isBusy}>
            Cancel
          </button>
          <button className="btn btn-primary" onClick={handleSubmit} disabled={isBusy}>
            {isBusy ? "Saving…" : isEdit ? "Save Changes" : "Create Lead"}
          </button>
        </div>
      }
    >
      {errors._general && (
        <div style={{
          padding:    "10px 12px",
          background: "#FEE2E2",
          border:     "1px solid #FCA5A5",
          borderRadius: 3,
          color:      "#991B1B",
          fontSize:   13,
          marginBottom: 12,
        }}>
          {errors._general}
        </div>
      )}

      <div className="form-grid-2" style={{ gap: 14 }}>

        {/* Row 1: Contact name + email */}
        <div className="form-group">
          <label className="form-label">Contact Name</label>
          <input className="form-input" value={form.contact_name}
            onChange={(e) => set("contact_name", e.target.value)}
            placeholder="Full name" />
          {errors.contact_name && <p className="form-error">{errors.contact_name}</p>}
        </div>

        <div className="form-group">
          <label className="form-label">Contact Email</label>
          <input className="form-input" type="email" value={form.contact_email}
            onChange={(e) => set("contact_email", e.target.value)}
            placeholder="email@company.com" />
          {errors.contact_email && <p className="form-error">{errors.contact_email}</p>}
        </div>

        {/* Row 2: Phone + Company */}
        <div className="form-group">
          <label className="form-label">Phone</label>
          <PhoneInput
            value={form.contact_phone}
            onChange={(v) => set("contact_phone", v)}
            placeholder="98765 43210"
          />
          {errors.contact_phone && <p className="form-error">{errors.contact_phone}</p>}
        </div>

        <div className="form-group">
          <label className="form-label">Company</label>
          <input className="form-input" value={form.company}
            onChange={(e) => set("company", e.target.value)}
            placeholder="Company name" />
          {errors.company && <p className="form-error">{errors.company}</p>}
        </div>

        {/* Row 3: Stage + Priority */}
        <div className="form-group">
          <label className="form-label">Stage *</label>
          <select className="form-select" value={form.stage}
            onChange={(e) => set("stage", e.target.value)}>
            <option value="" disabled>— Select stage —</option>
            {visibleStages.map((s) => (
              <option key={s.value} value={s.value}>{s.label}</option>
            ))}
          </select>
          {errors.stage && <p className="form-error">{errors.stage}</p>}
        </div>

        <div className="form-group">
          <label className="form-label">Priority *</label>
          <select className="form-select" value={form.priority}
            onChange={(e) => set("priority", e.target.value)}>
            <option value="" disabled>— Select priority —</option>
            {PRIORITIES.map((p) => (
              <option key={p} value={p}>{PRIORITY_META[p].label}</option>
            ))}
          </select>
          {errors.priority && <p className="form-error">{errors.priority}</p>}
        </div>

        {/* Row 4: Source */}
        <div className="form-group">
          <label className="form-label">Source *</label>
          <select className="form-select" value={form.source}
            onChange={(e) => set("source", e.target.value)}>
            <option value="">— Select source —</option>
            {SOURCES.map((s) => (
              <option key={s.value} value={s.value}>{s.label}</option>
            ))}
          </select>
          {errors.source && <p className="form-error">{errors.source}</p>}
        </div>

        {/* Conditional Tag field — plain text input, no autocomplete */}
        {needsTag && (
          <div className="form-group" style={{ gridColumn: "1 / -1" }}>
            <label className="form-label">
              {form.source === "event_conference"
                ? "Event/Conference Name *"
                : "Network Name *"}
            </label>
            <input
              className="form-input"
              type="text"
              value={form.tag_name || ""}
              onChange={(e) => set("tag_name", e.target.value)}
              placeholder={form.source === "event_conference"
                ? "e.g. TechConf 2024"
                : "e.g. ABC Network"}
              autoComplete="off"
            />
            {errors.tag_name && <p className="form-error">{errors.tag_name}</p>}
          </div>
        )}

        <div className="form-group">
          <label className="form-label">Website</label>
          <input className="form-input" type="text" value={form.website}
            onChange={(e) => set("website", e.target.value)}
            placeholder="e.g. abc.com or https://abc.com" />
          {errors.website && <p className="form-error">{errors.website}</p>}
        </div>

        {/* Assign to — admin/manager only; hidden for Raw stage */}
        {canAssign && form.stage !== "raw" && (
          <div className="form-group" style={{ gridColumn: "1 / -1" }}>
            <label className="form-label">Assign To</label>
            <select className="form-select" value={form.assigned_to}
              onChange={(e) => set("assigned_to", e.target.value)}>
              <option value="">— Unassigned —</option>
              {teamManagers.length > 0 && (
                <optgroup label="Managers">
                  {teamManagers.map((r) => (
                    <option key={r.id} value={r.id}>{r.full_name}</option>
                  ))}
                </optgroup>
              )}
              {teamMembers.length > 0 && (
                <optgroup label="Members">
                  {teamMembers.map((r) => (
                    <option key={r.id} value={r.id}>{r.full_name}</option>
                  ))}
                </optgroup>
              )}
            </select>
          </div>
        )}

        {/* Description */}
        <div className="form-group" style={{ gridColumn: "1 / -1" }}>
          <label className="form-label">Description</label>
          <textarea className="form-textarea" rows={3} value={form.description}
            onChange={(e) => set("description", e.target.value)}
            placeholder="Notes, context, or background for this lead…" />
          {errors.description && <p className="form-error">{errors.description}</p>}
          {errors.notes && <p className="form-error">{errors.notes}</p>}
        </div>

      </div>
    </Modal>
  );
}
