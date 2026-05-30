/**
 * components/tasks/TaskForm.jsx
 *
 * Create or edit a task.
 *
 * Props:
 *   task     — existing task object (edit mode) or null (create mode)
 *   leadId   — if provided, task will be pre-linked to this lead (lead locked)
 *   onClose  — close the modal
 *   onSaved  — called after successful save
 *
 * Validation:
 *   - lead is required (autocomplete on create; locked display on edit/leadId)
 *   - title is required
 *   - due_date is required and must not be in the past (create only)
 *   - assigned_to is required (defaults to current user)
 */
import { useState, useEffect, useRef } from "react";
import Modal        from "@/components/common/Modal";
import { useToast } from "@/components/common/Toast";
import { useAuth }  from "@/hooks/useAuth";
import { useTeam }  from "@/hooks/useUsers";
import { leadsApi } from "@/api/leads";
import {
  useCreateTask,
  useUpdateTask,
} from "@/hooks/useTasks";
import { TASK_STATUS_META, TASK_PRIORITY_META } from "@/utils/formatters";
import { isAdminOrManager } from "@/utils/roles";
import { STAGES, STAGE_MAP } from "@/utils/leadConstants";

const STATUSES   = Object.keys(TASK_STATUS_META);
const PRIORITIES = Object.keys(TASK_PRIORITY_META);

const today = () => new Date().toISOString().split("T")[0];

const EMPTY = {
  title:       "",
  description: "",
  priority:    "medium",
  status:      "pending",
  due_date:    today(),
  due_time:    "",
  assigned_to: "",
};

function taskToForm(task) {
  return {
    title:       task.title       ?? "",
    description: task.description ?? "",
    priority:    task.priority    ?? "medium",
    status:      task.status      ?? "pending",
    due_date:    task.due_date    ?? today(),
    due_time:    task.due_time    ?? "",
    assigned_to: task.assigned_to ?? "",
  };
}

export default function TaskForm({ task = null, leadId = null, onClose, onSaved }) {
  const isEdit       = !!task;
  // Lead is locked when editing an existing task or when a leadId is pre-supplied
  const isLeadLocked = isEdit || !!leadId;
  const toast        = useToast();
  const { user }     = useAuth();
  const canAssign    = isAdminOrManager(user);

  const [form,   setForm]   = useState(isEdit ? taskToForm(task) : {
    ...EMPTY,
    assigned_to: user?.id ?? "",
  });
  const [errors, setErrors] = useState({});

  const { data: team = [] } = useTeam();

  const createTask = useCreateTask();
  const updateTask = useUpdateTask();

  const set = (k, v) => {
    setForm((f) => ({ ...f, [k]: v }));
    if (errors[k]) setErrors((e) => ({ ...e, [k]: "" }));
  };

  // ── Lead autocomplete state ────────────────────────────────────────────────
  const [selectedLead, setSelectedLead] = useState(null);
  const [stageChange,  setStageChange]  = useState("");
  const [leadQuery,    setLeadQuery]    = useState("");
  const [leadResults,  setLeadResults]  = useState([]);
  const [leadOpen,     setLeadOpen]     = useState(false);
  const [leadLoading,  setLeadLoading]  = useState(false);
  const leadDebounceRef  = useRef(null);
  const leadContainerRef = useRef(null);

  // ── Pre-fill lead from leadId prop (create) or task.lead (edit) ────────────
  useEffect(() => {
    const fetchLead = async (id) => {
      try {
        const res = await leadsApi.get(id);
        const l = res.data;
        setSelectedLead({
          id:           l.id,
          contact_name: l.contact_name,
          company:      l.company,
          stage:        l.stage,
          assigned_to:  l.assigned_to,
          created_by:   l.created_by,
        });
      } catch {
        // silently skip — lead selector will stay empty
      }
    };

    if (isEdit && task?.lead) {
      fetchLead(task.lead);
    } else if (leadId) {
      fetchLead(leadId);
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Debounced lead search ──────────────────────────────────────────────────
  useEffect(() => {
    if (leadDebounceRef.current) clearTimeout(leadDebounceRef.current);
    if (!leadQuery.trim()) {
      setLeadResults([]);
      return;
    }
    setLeadLoading(true);
    leadDebounceRef.current = setTimeout(async () => {
      try {
        const res = await leadsApi.search(leadQuery.trim(), 10);
        setLeadResults(res.data.results ?? res.data ?? []);
      } catch {
        setLeadResults([]);
      } finally {
        setLeadLoading(false);
      }
    }, 300);
    return () => clearTimeout(leadDebounceRef.current);
  }, [leadQuery]);

  // ── Click outside closes dropdown ──────────────────────────────────────────
  useEffect(() => {
    const handler = (e) => {
      if (leadContainerRef.current && !leadContainerRef.current.contains(e.target)) {
        setLeadOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const handleLeadSelect = (lead) => {
    setSelectedLead({
      id:           lead.id,
      contact_name: lead.contact_name,
      company:      lead.company,
      stage:        lead.stage,
      assigned_to:  lead.assigned_to,
      created_by:   lead.created_by,
    });
    setStageChange("");
    setLeadQuery("");
    setLeadOpen(false);
    setLeadResults([]);
    if (errors.lead) setErrors((e) => ({ ...e, lead: "" }));
  };

  const handleLeadClear = () => {
    if (isLeadLocked) return;
    setSelectedLead(null);
    setStageChange("");
  };

  // Can this user change the selected lead's stage?
  const canUpdateStage = !!selectedLead && (
    user?.role === "admin" ||
    user?.is_mis_approver ||
    selectedLead.assigned_to === user?.id ||
    selectedLead.created_by  === user?.id ||
    user?.role === "manager"
  );

  // Visible stage options: hide "raw" from non-admins
  const stageOptions = STAGES.filter((s) => s.value !== "raw" || user?.role === "admin");

  // ── Validation ─────────────────────────────────────────────────────────────
  const validate = () => {
    const e = {};
    if (!selectedLead)        e.lead      = "Please select a lead for this task.";
    if (!form.title.trim())   e.title     = "Title is required.";
    if (!form.due_date)       e.due_date  = "Due date is required.";
    else if (!isEdit && form.due_date < today())
                              e.due_date  = "Due date cannot be in the past.";
    if (!form.assigned_to)    e.assigned_to = "Please assign this task to someone.";
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  // ── Submit ─────────────────────────────────────────────────────────────────
  const handleSubmit = async () => {
    if (!validate()) return;

    const payload = {
      title:       form.title.trim(),
      description: form.description.trim(),
      priority:    form.priority,
      due_date:    form.due_date,
      due_time:    form.due_time || null,
      assigned_to: form.assigned_to,
    };

    if (isEdit) payload.status = form.status;

    // Lead: only sent on create; ignored by backend on edit
    if (!isEdit && selectedLead) {
      payload.lead = selectedLead.id;
    }

    // Stage change: only sent when actually different from current stage
    if (stageChange && selectedLead && stageChange !== selectedLead.stage) {
      payload.stage_change = stageChange;
    }

    try {
      if (isEdit) {
        await updateTask.mutateAsync({ id: task.id, data: payload });
        toast.success("Task updated!");
      } else {
        await createTask.mutateAsync(payload);
        toast.success("Task created!");
      }
      onSaved?.();
      onClose();
    } catch (err) {
      const detail = err.response?.data;
      if (typeof detail === "object" && !Array.isArray(detail)) {
        const fieldErrors = {};
        Object.entries(detail).forEach(([k, v]) => {
          fieldErrors[k] = Array.isArray(v) ? v[0] : String(v);
        });
        setErrors(fieldErrors);
      } else {
        toast.error("Something went wrong. Please try again.");
      }
    }
  };

  const isBusy = createTask.isPending || updateTask.isPending;

  // Build team options — sales employee only sees themselves
  const teamOptions   = canAssign ? team : team.filter((m) => m.id === user?.id);
  const otherOptions  = teamOptions.filter((m) => m.id !== user?.id);
  const otherManagers = [...otherOptions]
    .filter((r) => r.role === "manager")
    .sort((a, b) => a.full_name.localeCompare(b.full_name));
  const otherMembers  = [...otherOptions]
    .filter((r) => r.role !== "manager")
    .sort((a, b) => a.full_name.localeCompare(b.full_name));

  return (
    <Modal
      open
      onClose={onClose}
      title={isEdit ? "Edit Task" : "Add Task"}
      subtitle={
        isEdit
          ? `Editing: ${task.title}`
          : leadId
          ? "New task linked to this lead"
          : "Create a task"
      }
      size="md"
      footer={
        <div className="modal-footer">
          <button className="btn btn-secondary" onClick={onClose} disabled={isBusy}>
            Cancel
          </button>
          <button className="btn btn-primary" onClick={handleSubmit} disabled={isBusy}>
            {isBusy ? "Saving…" : isEdit ? "Save Changes" : "Create Task"}
          </button>
        </div>
      }
    >
      <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>

        {/* ── Lead selector ──────────────────────────────────────────── */}
        <div className="form-group">
          <label className="form-label">Lead *</label>

          {selectedLead ? (
            /* Selected / locked display */
            <div style={{
              display:        "flex",
              alignItems:     "center",
              justifyContent: "space-between",
              padding:        "10px 12px",
              background:     "var(--surface)",
              border:         "1px solid var(--border)",
              borderRadius:   4,
            }}>
              <div>
                <div style={{ fontSize: 13, fontWeight: 600, color: "var(--text)" }}>
                  {selectedLead.contact_name || "Unnamed"}
                </div>
                {selectedLead.company && (
                  <div style={{ fontSize: 11, color: "var(--text3)", marginTop: 1 }}>
                    {selectedLead.company}
                  </div>
                )}
              </div>
              {isLeadLocked ? (
                <span style={{ fontSize: 10, color: "var(--text3)", fontStyle: "italic" }}>
                  Locked
                </span>
              ) : (
                <button
                  type="button"
                  onClick={handleLeadClear}
                  style={{
                    background: "transparent",
                    border:     "none",
                    color:      "var(--text3)",
                    cursor:     "pointer",
                    fontSize:   14,
                    lineHeight: 1,
                    padding:    "0 4px",
                  }}
                  title="Change lead"
                >
                  ✕
                </button>
              )}
            </div>
          ) : (
            /* Autocomplete input */
            <div ref={leadContainerRef} style={{ position: "relative" }}>
              <input
                type="text"
                value={leadQuery}
                onChange={(e) => { setLeadQuery(e.target.value); setLeadOpen(true); }}
                onFocus={() => leadQuery && setLeadOpen(true)}
                placeholder="Search for a lead by name or company…"
                className="form-input"
                autoFocus={!isLeadLocked}
              />
              {leadOpen && leadQuery.trim() && (
                <div style={{
                  position:     "absolute",
                  top:          "calc(100% + 4px)",
                  left:         0,
                  right:        0,
                  maxHeight:    240,
                  overflowY:    "auto",
                  background:   "var(--white)",
                  border:       "1px solid var(--border)",
                  borderRadius: 4,
                  boxShadow:    "0 4px 12px rgba(0,0,0,0.12)",
                  zIndex:       200,
                }}>
                  {leadLoading && (
                    <div style={{ padding: "12px 14px", fontSize: 12, color: "var(--text3)" }}>
                      Searching…
                    </div>
                  )}
                  {!leadLoading && leadResults.length === 0 && (
                    <div style={{ padding: "12px 14px", fontSize: 12, color: "var(--text3)" }}>
                      No leads found.
                    </div>
                  )}
                  {!leadLoading && leadResults.map((lead) => (
                    <button
                      key={lead.id}
                      type="button"
                      onMouseDown={(e) => e.preventDefault()}
                      onClick={() => handleLeadSelect(lead)}
                      style={{
                        display:      "block",
                        width:        "100%",
                        padding:      "10px 14px",
                        background:   "transparent",
                        border:       "none",
                        borderBottom: "1px solid var(--border)",
                        textAlign:    "left",
                        cursor:       "pointer",
                        fontFamily:   "inherit",
                      }}
                      onMouseEnter={(e) => { e.currentTarget.style.background = "var(--surface)"; }}
                      onMouseLeave={(e) => { e.currentTarget.style.background = "transparent"; }}
                    >
                      <div style={{ fontSize: 13, fontWeight: 600, color: "var(--text)" }}>
                        {lead.contact_name || "Unnamed"}
                      </div>
                      {lead.company && (
                        <div style={{ fontSize: 11, color: "var(--text3)", marginTop: 1 }}>
                          {lead.company}
                        </div>
                      )}
                      {lead.stage && (
                        <div style={{
                          fontSize:   10,
                          fontWeight: 600,
                          marginTop:  3,
                          color:      STAGE_MAP[lead.stage]?.color ?? "var(--text3)",
                        }}>
                          {STAGE_MAP[lead.stage]?.label ?? lead.stage}
                        </div>
                      )}
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}

          {errors.lead && <p className="form-error">{errors.lead}</p>}
        </div>

        {/* ── Stage dropdown (after lead selected) ───────────────────── */}
        {selectedLead && (
          <div className="form-group">
            <label className="form-label">
              Lead Stage{" "}
              <span style={{ color: "var(--text3)", fontWeight: 400 }}>(optional)</span>
            </label>
            <select
              value={stageChange || selectedLead.stage || ""}
              onChange={(e) => {
                const v = e.target.value;
                setStageChange(v === selectedLead.stage ? "" : v);
              }}
              disabled={!canUpdateStage}
              className="form-select"
              title={!canUpdateStage ? "You don't have permission to change this lead's stage." : undefined}
            >
              {stageOptions.map((s) => (
                <option key={s.value} value={s.value}>{s.label}</option>
              ))}
            </select>
            <p style={{ fontSize: 10, color: "var(--text3)", marginTop: 4 }}>
              {!canUpdateStage
                ? "You don't have permission to change this lead's stage."
                : stageChange
                  ? `Will update stage from "${STAGE_MAP[selectedLead.stage]?.label ?? selectedLead.stage}" → "${STAGE_MAP[stageChange]?.label ?? stageChange}" on save.`
                  : "Change to update the lead's stage when you save this task."
              }
            </p>
            {errors.stage_change && <p className="form-error">{errors.stage_change}</p>}
          </div>
        )}

        {/* ── Title ─────────────────────────────────────────────────── */}
        <div className="form-group">
          <label className="form-label">Title *</label>
          <input
            className="form-input"
            value={form.title}
            onChange={(e) => set("title", e.target.value)}
            placeholder="e.g. Call Suresh Kumar at 3 PM"
            autoFocus={isLeadLocked}
          />
          {errors.title && <p className="form-error">{errors.title}</p>}
        </div>

        {/* ── Due date + time ────────────────────────────────────────── */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
          <div className="form-group">
            <label className="form-label">Due Date *</label>
            <input
              className="form-input"
              type="date"
              value={form.due_date}
              onChange={(e) => set("due_date", e.target.value)}
              min={isEdit ? undefined : today()}
            />
            {errors.due_date && <p className="form-error">{errors.due_date}</p>}
          </div>
          <div className="form-group">
            <label className="form-label">
              Due Time{" "}
              <span style={{ color: "var(--text3)", fontWeight: 400 }}>(optional)</span>
            </label>
            <input
              className="form-input"
              type="time"
              value={form.due_time}
              onChange={(e) => set("due_time", e.target.value)}
            />
          </div>
        </div>

        {/* ── Priority + Status ──────────────────────────────────────── */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
          <div className="form-group">
            <label className="form-label">Priority</label>
            <select
              className="form-select"
              value={form.priority}
              onChange={(e) => set("priority", e.target.value)}
            >
              {PRIORITIES.map((p) => (
                <option key={p} value={p}>{TASK_PRIORITY_META[p].label}</option>
              ))}
            </select>
          </div>

          {/* Status — edit mode only */}
          {isEdit && (
            <div className="form-group">
              <label className="form-label">Status</label>
              <select
                className="form-select"
                value={form.status}
                onChange={(e) => set("status", e.target.value)}
              >
                {STATUSES.map((s) => (
                  <option key={s} value={s}>{TASK_STATUS_META[s].label}</option>
                ))}
              </select>
            </div>
          )}
        </div>

        {/* ── Assign to ─────────────────────────────────────────────── */}
        <div className="form-group">
          <label className="form-label">Assign To *</label>
          <select
            className="form-select"
            value={form.assigned_to}
            onChange={(e) => set("assigned_to", e.target.value)}
            disabled={!canAssign}
          >
            <option value="">— Select person —</option>
            <option value={user?.id}>{user?.full_name} (me)</option>
            {otherManagers.length > 0 && (
              <optgroup label="Managers">
                {otherManagers.map((m) => (
                  <option key={m.id} value={m.id}>{m.full_name}</option>
                ))}
              </optgroup>
            )}
            {otherMembers.length > 0 && (
              <optgroup label="Members">
                {otherMembers.map((m) => (
                  <option key={m.id} value={m.id}>{m.full_name}</option>
                ))}
              </optgroup>
            )}
          </select>
          {errors.assigned_to && <p className="form-error">{errors.assigned_to}</p>}
          {!canAssign && (
            <p style={{ fontSize: 10, color: "var(--text3)", marginTop: 2 }}>
              Tasks can only be assigned to yourself.
            </p>
          )}
        </div>

        {/* ── Description ───────────────────────────────────────────── */}
        <div className="form-group">
          <label className="form-label">
            Description{" "}
            <span style={{ color: "var(--text3)", fontWeight: 400 }}>(optional)</span>
          </label>
          <textarea
            className="form-textarea"
            rows={3}
            value={form.description}
            onChange={(e) => set("description", e.target.value)}
            placeholder="Additional context or notes…"
          />
        </div>

      </div>
    </Modal>
  );
}
