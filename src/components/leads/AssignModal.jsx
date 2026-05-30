/**
 * components/leads/AssignModal.jsx
 *
 * Assign or reassign a lead with full task handling.
 *
 * Flow:
 *  1. Fetch pending tasks linked to this lead
 *  2. Show rep selector + workload preview
 *  3. If pending tasks exist → show 3-choice task prompt:
 *       a) Move all tasks to new assignee
 *       b) Keep all tasks with current owner
 *       c) Decide per task (individual checkboxes)
 *  4. On confirm → POST /api/leads/{id}/assign/ with task_action + task_ids
 */
import { useState } from "react";
import Modal    from "@/components/common/Modal";
import Avatar   from "@/components/common/Avatar";
import Spinner  from "@/components/common/Spinner";
import { useToast }             from "@/components/common/Toast";
import { useAssignLead,
         useLeadPendingTasks }  from "@/hooks/useLeads";
import { useTeam }              from "@/hooks/useUsers";
import { useWorkload }          from "@/hooks/useAssignments";
import { TASK_PRIORITY_META }   from "@/utils/formatters";

// ── Task action choices ────────────────────────────────────────────────────────
const TASK_ACTIONS = [
  {
    id:          "move_all",
    label:       "Move all to new assignee",
    description: "Transfer all pending tasks to the new owner.",
    icon:        "→",
    color:       "#1A5A9A",
    bg:          "#E8F2FC",
    border:      "#A8C8F0",
  },
  {
    id:          "keep_all",
    label:       "Keep all with current owner",
    description: "Leave all pending tasks with the original owner.",
    icon:        "⊙",
    color:       "#7A4A00",
    bg:          "#FDF4E0",
    border:      "#F0D080",
  },
  {
    id:          "per_task",
    label:       "Decide per task",
    description: "Choose which tasks to move and which to keep.",
    icon:        "☐",
    color:       "#6030A0",
    bg:          "#EEE0F8",
    border:      "#C8A8F0",
  },
];

export default function AssignModal({ lead, onClose }) {
  const toast = useToast();

  // ── State ──────────────────────────────────────────────────────────────────
  const [selectedRep, setSelectedRep] = useState(lead.assigned_to ?? "");
  const [note,        setNote]        = useState("");
  const [taskAction,  setTaskAction]  = useState("move_all");
  const [selectedTaskIds, setSelectedTaskIds] = useState([]);

  // ── Data ───────────────────────────────────────────────────────────────────
  const { data: team     = [], isLoading: teamLoading } = useTeam();
  const { data: workload = []                         } = useWorkload();
  const { data: pendingData, isLoading: pendingLoading } = useLeadPendingTasks(lead.id);

  const pendingTasks  = pendingData?.tasks   ?? [];
  const pendingCount  = pendingData?.count   ?? 0;
  const hasPending    = pendingCount > 0;

  const getRepLoad = (repId) =>
    workload.find((w) => w.user.id === repId)?.total ?? 0;

  const currentRep = team.find((r) => r.id === lead.assigned_to);
  const chosenRep  = team.find((r) => r.id === selectedRep);

  const teamManagers = [...team]
    .filter((r) => r.role === "manager")
    .sort((a, b) => a.full_name.localeCompare(b.full_name));
  const teamMembers = [...team]
    .filter((r) => r.role !== "manager")
    .sort((a, b) => a.full_name.localeCompare(b.full_name));

  // ── Per-task checkbox toggle ────────────────────────────────────────────────
  const toggleTask = (taskId) => {
    setSelectedTaskIds((prev) =>
      prev.includes(taskId)
        ? prev.filter((id) => id !== taskId)
        : [...prev, taskId]
    );
  };

  // ── Submit ─────────────────────────────────────────────────────────────────
  const assignMutation = useAssignLead();

  const handleAssign = async () => {
    if (!selectedRep) return;
    try {
      await assignMutation.mutateAsync({
        id:         lead.id,
        assignedTo: selectedRep,
        note,
        taskAction: hasPending ? taskAction      : "keep_all",
        taskIds:    taskAction === "per_task" ? selectedTaskIds : [],
      });
      toast.success(`Lead assigned to ${chosenRep?.full_name ?? "rep"}`);
      onClose();
    } catch (err) {
      toast.error(
        err.response?.data?.non_field_errors?.[0] ??
        err.response?.data?.detail ??
        "Could not assign lead."
      );
    }
  };

  const canConfirm =
    !!selectedRep &&
    selectedRep !== lead.assigned_to &&
    !assignMutation.isPending &&
    (taskAction !== "per_task" || selectedTaskIds.length > 0);

  // ── Render ─────────────────────────────────────────────────────────────────
  return (
    <Modal
      open
      onClose={onClose}
      title={lead.assigned_to ? "Reassign Lead" : "Assign Lead"}
      subtitle={lead.title}
      size={hasPending ? "wide" : "sm"}
      footer={
        <div className="modal-footer">
          <button className="btn btn-secondary" onClick={onClose}>
            Cancel
          </button>
          <button
            className="btn btn-primary"
            onClick={handleAssign}
            disabled={!canConfirm}
          >
            {assignMutation.isPending ? "Assigning…" : "Confirm Assignment"}
          </button>
        </div>
      }
    >
      {/* ── Currently assigned ── */}
      {currentRep && (
        <div style={{
          background:   "var(--surface)",
          border:       "1px solid var(--border)",
          borderRadius: 3,
          padding:      "9px 12px",
          marginBottom: 14,
          display:      "flex",
          alignItems:   "center",
          gap:          10,
        }}>
          <span style={{ fontSize: 11, color: "var(--text3)" }}>Currently:</span>
          <Avatar name={currentRep.full_name} size={22} />
          <span style={{ fontSize: 12, fontWeight: 600 }}>{currentRep.full_name}</span>
        </div>
      )}

      {/* ── Two-column layout when there are pending tasks ── */}
      <div style={{
        display:             "grid",
        gridTemplateColumns: hasPending ? "1fr 1fr" : "1fr",
        gap:                 16,
        alignItems:          "start",
      }}>

        {/* LEFT — Rep selector + note */}
        <div>
          {/* Rep selector */}
          <div className="form-group" style={{ marginBottom: 12 }}>
            <label className="form-label">Assign To *</label>
            {teamLoading ? <Spinner /> : (
              <select
                className="form-select"
                value={selectedRep}
                onChange={(e) => setSelectedRep(e.target.value)}
              >
                <option value="">— Select a rep —</option>
                {teamManagers.length > 0 && (
                  <optgroup label="Managers">
                    {teamManagers.map((rep) => (
                      <option key={rep.id} value={rep.id}>
                        {rep.full_name} ({getRepLoad(rep.id)} leads)
                      </option>
                    ))}
                  </optgroup>
                )}
                {teamMembers.length > 0 && (
                  <optgroup label="Members">
                    {teamMembers.map((rep) => (
                      <option key={rep.id} value={rep.id}>
                        {rep.full_name} ({getRepLoad(rep.id)} leads)
                      </option>
                    ))}
                  </optgroup>
                )}
              </select>
            )}
          </div>

          {/* Chosen rep workload preview */}
          {chosenRep && (
            <div style={{
              background:   "var(--accent-lt)",
              border:       "1px solid var(--border2)",
              borderRadius: 3,
              padding:      "10px 12px",
              display:      "flex",
              alignItems:   "center",
              gap:          10,
              marginBottom: 12,
            }}>
              <Avatar name={chosenRep.full_name} size={32} />
              <div>
                <p style={{ fontSize: 12, fontWeight: 700 }}>{chosenRep.full_name}</p>
                <p style={{ fontSize: 10, color: "var(--text3)" }}>
                  {chosenRep.email} · {getRepLoad(chosenRep.id)} leads
                </p>
              </div>
            </div>
          )}

          {/* Note */}
          <div className="form-group">
            <label className="form-label">Note (optional)</label>
            <textarea
              className="form-textarea"
              rows={2}
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="Reason for this assignment…"
            />
          </div>
        </div>

        {/* RIGHT — Task handling (only when pending tasks exist) */}
        {hasPending && (
          <div>
            {/* Header */}
            <p style={{
              fontSize:      9,
              fontWeight:    700,
              color:         "var(--text3)",
              textTransform: "uppercase",
              letterSpacing: "0.1em",
              marginBottom:  10,
            }}>
              {pendingCount} Pending Task{pendingCount !== 1 ? "s" : ""} on this lead
            </p>

            {/* 3-choice radio buttons */}
            <div style={{ display: "flex", flexDirection: "column", gap: 6, marginBottom: 12 }}>
              {TASK_ACTIONS.map((action) => (
                <button
                  key={action.id}
                  onClick={() => setTaskAction(action.id)}
                  style={{
                    display:      "flex",
                    alignItems:   "flex-start",
                    gap:          10,
                    padding:      "9px 12px",
                    borderRadius: 3,
                    border:       taskAction === action.id
                      ? `1.5px solid ${action.border}`
                      : "1.5px solid var(--border)",
                    background:   taskAction === action.id
                      ? action.bg
                      : "var(--white)",
                    cursor:       "pointer",
                    textAlign:    "left",
                    transition:   "all 0.12s",
                    fontFamily:   "inherit",
                    width:        "100%",
                  }}
                >
                  {/* Radio dot */}
                  <div style={{
                    width:        16,
                    height:       16,
                    borderRadius: "50%",
                    border:       taskAction === action.id
                      ? `4.5px solid ${action.color}`
                      : "1.5px solid var(--border2)",
                    flexShrink:   0,
                    marginTop:    1,
                    transition:   "all 0.12s",
                  }} />

                  <div>
                    <p style={{
                      fontSize:   12,
                      fontWeight: taskAction === action.id ? 700 : 500,
                      color:      taskAction === action.id ? action.color : "var(--text)",
                      marginBottom: 2,
                    }}>
                      {action.icon} {action.label}
                    </p>
                    <p style={{ fontSize: 10, color: "var(--text3)", lineHeight: 1.4 }}>
                      {action.description}
                    </p>
                  </div>
                </button>
              ))}
            </div>

            {/* Per-task checkboxes */}
            {taskAction === "per_task" && (
              <div>
                <p style={{
                  fontSize:      9,
                  fontWeight:    700,
                  color:         "var(--text3)",
                  textTransform: "uppercase",
                  letterSpacing: "0.08em",
                  marginBottom:  6,
                }}>
                  Select tasks to move
                </p>
                {pendingLoading ? (
                  <Spinner />
                ) : (
                  <div style={{
                    display:       "flex",
                    flexDirection: "column",
                    gap:           4,
                    maxHeight:     200,
                    overflowY:     "auto",
                  }}>
                    {pendingTasks.map((task) => {
                      const isChecked = selectedTaskIds.includes(task.id);
                      const prio      = TASK_PRIORITY_META[task.priority];
                      return (
                        <button
                          key={task.id}
                          onClick={() => toggleTask(task.id)}
                          style={{
                            display:      "flex",
                            alignItems:   "center",
                            gap:          8,
                            padding:      "7px 10px",
                            borderRadius: 3,
                            border:       isChecked
                              ? "1px solid #A8C8F0"
                              : "1px solid var(--border)",
                            background:   isChecked ? "#E8F2FC" : "var(--surface)",
                            cursor:       "pointer",
                            textAlign:    "left",
                            fontFamily:   "inherit",
                            width:        "100%",
                            transition:   "all 0.1s",
                          }}
                        >
                          {/* Checkbox */}
                          <div style={{
                            width:        14,
                            height:       14,
                            borderRadius: 2,
                            border:       isChecked
                              ? "none"
                              : "1.5px solid var(--border2)",
                            background:   isChecked ? "#1A5A9A" : "var(--white)",
                            display:      "flex",
                            alignItems:   "center",
                            justifyContent: "center",
                            flexShrink:   0,
                          }}>
                            {isChecked && (
                              <svg width="9" height="9" viewBox="0 0 10 10" fill="none">
                                <path d="M2 5L4 7.5L8 3" stroke="white"
                                  strokeWidth="1.8" strokeLinecap="round"
                                  strokeLinejoin="round"/>
                              </svg>
                            )}
                          </div>

                          {/* Task details */}
                          <div style={{ flex: 1, minWidth: 0 }}>
                            <p style={{
                              fontSize:     11,
                              fontWeight:   500,
                              color:        "var(--text)",
                              overflow:     "hidden",
                              textOverflow: "ellipsis",
                              whiteSpace:   "nowrap",
                            }}>
                              {task.title}
                            </p>
                            <p style={{ fontSize: 10, color: "var(--text3)" }}>
                              Due {task.due_date}
                            </p>
                          </div>

                          {/* Priority badge */}
                          <span style={{
                            fontSize:     9,
                            fontWeight:   500,
                            padding:      "1px 5px",
                            borderRadius: 3,
                            background:   prio?.bg,
                            color:        prio?.color,
                            border:       `1px solid ${prio?.border}`,
                            flexShrink:   0,
                          }}>
                            {prio?.label}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                )}

                {/* Selected count */}
                {selectedTaskIds.length > 0 && (
                  <p style={{
                    fontSize:  10,
                    color:     "#1A5A9A",
                    fontWeight: 600,
                    marginTop: 6,
                  }}>
                    {selectedTaskIds.length} of {pendingCount} task{pendingCount !== 1 ? "s" : ""} selected to move
                  </p>
                )}
              </div>
            )}
          </div>
        )}
      </div>
    </Modal>
  );
}