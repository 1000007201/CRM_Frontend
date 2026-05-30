/**
 * components/tasks/TaskList.jsx
 *
 * Renders a list of TaskCards with:
 *   - Filter bar (status, priority, date range)
 *   - Empty state
 *   - Inline delete confirmation
 *   - Add Task button → TaskForm modal
 *
 * Used in:
 *   - Lead Detail tasks tab (with leadId prop)
 *   - My Tasks page (without leadId — standalone tasks)
 */
import { useState } from "react";
import TaskCard   from "./TaskCard";
import TaskForm   from "./TaskForm";
import Spinner    from "@/components/common/Spinner";
import EmptyState from "@/components/common/EmptyState";
import Modal      from "@/components/common/Modal";
import { useToast }      from "@/components/common/Toast";
import { useDeleteTask } from "@/hooks/useTasks";
import { TASK_STATUS_META, TASK_PRIORITY_META } from "@/utils/formatters";

const STATUS_OPTIONS   = Object.keys(TASK_STATUS_META);
const PRIORITY_OPTIONS = Object.keys(TASK_PRIORITY_META);

export default function TaskList({
  tasks     = [],
  loading   = false,
  leadId    = null,    // if set, new tasks are linked to this lead
  showLead  = false,   // show linked lead name on each card
  showAdd   = true,    // show the "+ Add Task" button
  onRefresh = null,    // called after create/edit/delete to re-fetch
}) {
  const toast  = useToast();
  const deleteTask = useDeleteTask();

  // ── Modal state ───────────────────────────────────────────────────────────
  const [showCreate, setShowCreate] = useState(false);
  const [editTask,   setEditTask]   = useState(null);
  const [deleteConfirm, setDeleteConfirm] = useState(null);

  // ── Local filters ─────────────────────────────────────────────────────────
  const [statusFilter,   setStatusFilter]   = useState("");
  const [priorityFilter, setPriorityFilter] = useState("");
  const [showCompleted,  setShowCompleted]  = useState(false);

  // ── Delete ────────────────────────────────────────────────────────────────
  const handleDelete = async () => {
    if (!deleteConfirm) return;
    try {
      await deleteTask.mutateAsync(deleteConfirm.id);
      toast.success("Task deleted.");
      setDeleteConfirm(null);
      onRefresh?.();
    } catch {
      toast.error("Could not delete task.");
    }
  };

  // ── Filter tasks ──────────────────────────────────────────────────────────
  const filtered = tasks.filter((t) => {
    if (!showCompleted && (t.status === "completed" || t.status === "cancelled"))
      return false;
    if (statusFilter   && t.status   !== statusFilter)   return false;
    if (priorityFilter && t.priority !== priorityFilter) return false;
    return true;
  });

  // Group: overdue first, then by due_date asc
  const overdue  = filtered.filter((t) => t.is_overdue && t.status !== "completed");
  const active   = filtered.filter((t) => !t.is_overdue && t.status !== "completed" && t.status !== "cancelled");
  const done     = filtered.filter((t) => t.status === "completed" || t.status === "cancelled");

  const totalPending = tasks.filter(
    (t) => t.status === "pending" || t.status === "in_progress"
  ).length;

  return (
    <div>
      {/* ── Header ── */}
      <div style={{
        display:        "flex",
        alignItems:     "center",
        justifyContent: "space-between",
        marginBottom:   12,
        gap:            8,
        flexWrap:       "wrap",
      }}>
        {/* Filter bar */}
        <div style={{ display: "flex", gap: 6, alignItems: "center", flexWrap: "wrap" }}>
          <select
            className="form-select"
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            style={{ width: "auto", minWidth: 120 }}
          >
            <option value="">All Status</option>
            {STATUS_OPTIONS.map((s) => (
              <option key={s} value={s}>{TASK_STATUS_META[s].label}</option>
            ))}
          </select>

          <select
            className="form-select"
            value={priorityFilter}
            onChange={(e) => setPriorityFilter(e.target.value)}
            style={{ width: "auto", minWidth: 120 }}
          >
            <option value="">All Priority</option>
            {PRIORITY_OPTIONS.map((p) => (
              <option key={p} value={p}>{TASK_PRIORITY_META[p].label}</option>
            ))}
          </select>

          {/* Toggle completed */}
          <button
            className="btn btn-secondary btn-sm"
            onClick={() => setShowCompleted((v) => !v)}
            style={{
              background  : showCompleted ? "var(--accent-lt)" : "none",
              borderColor : showCompleted ? "var(--accent)"    : "var(--border2)",
              color       : showCompleted ? "var(--accent)"    : "var(--text2)",
              height      : 31,
            }}
          >
            {showCompleted ? "✓ Showing Done" : "Show Done"}
          </button>

          {/* Clear filters */}
          {(statusFilter || priorityFilter) && (
            <button
              className="btn btn-ghost btn-sm"
              onClick={() => { setStatusFilter(""); setPriorityFilter(""); }}
              style={{ color: "var(--red)" }}
            >
              ✕ Clear
            </button>
          )}
        </div>

        {/* Add task button */}
        {showAdd && (
          <button
            className="btn btn-primary btn-sm"
            onClick={() => setShowCreate(true)}
          >
            + Add Task
          </button>
        )}
      </div>

      {/* ── Task list ── */}
      {loading ? (
        <Spinner center />
      ) : filtered.length === 0 && tasks.length === 0 ? (
        <EmptyState
          icon="☐"
          title="No tasks yet"
          subtitle={showAdd ? 'Click "+ Add Task" to create the first task' : "No tasks here"}
        />
      ) : filtered.length === 0 ? (
        <EmptyState
          icon="☐"
          title="No tasks match these filters"
          subtitle="Try adjusting the filters above"
        />
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 0 }}>

          {/* Overdue section */}
          {overdue.length > 0 && (
            <Section
              label={`Overdue (${overdue.length})`}
              color="#C03030"
              bg="#FCE8E8"
            >
              {overdue.map((task) => (
                <TaskCard
                  key={task.id}
                  task={task}
                  showLead={showLead}
                  onEdit={setEditTask}
                  onDelete={setDeleteConfirm}
                />
              ))}
            </Section>
          )}

          {/* Active section */}
          {active.length > 0 && (
            <Section
              label={`Pending (${active.length})`}
              color="var(--text2)"
              bg="var(--surface)"
            >
              {active.map((task) => (
                <TaskCard
                  key={task.id}
                  task={task}
                  showLead={showLead}
                  onEdit={setEditTask}
                  onDelete={setDeleteConfirm}
                />
              ))}
            </Section>
          )}

          {/* Completed section */}
          {showCompleted && done.length > 0 && (
            <Section
              label={`Completed / Cancelled (${done.length})`}
              color="var(--text3)"
              bg="var(--bg)"
            >
              {done.map((task) => (
                <TaskCard
                  key={task.id}
                  task={task}
                  showLead={showLead}
                  onEdit={setEditTask}
                  onDelete={setDeleteConfirm}
                />
              ))}
            </Section>
          )}
        </div>
      )}

      {/* ── Modals ── */}
      {showCreate && (
        <TaskForm
          leadId={leadId}
          onClose={() => setShowCreate(false)}
          onSaved={() => { setShowCreate(false); onRefresh?.(); }}
        />
      )}

      {editTask && (
        <TaskForm
          task={editTask}
          leadId={editTask.lead ?? leadId}
          onClose={() => setEditTask(null)}
          onSaved={() => { setEditTask(null); onRefresh?.(); }}
        />
      )}

      {/* Delete confirmation */}
      {deleteConfirm && (
        <Modal
          open
          onClose={() => setDeleteConfirm(null)}
          title="Delete Task"
          size="sm"
          footer={
            <div className="modal-footer">
              <button className="btn btn-secondary" onClick={() => setDeleteConfirm(null)}>
                Cancel
              </button>
              <button
                className="btn btn-danger"
                onClick={handleDelete}
                disabled={deleteTask.isPending}
              >
                {deleteTask.isPending ? "Deleting…" : "Yes, Delete"}
              </button>
            </div>
          }
        >
          <div style={{ textAlign: "center", padding: "8px 0 4px" }}>
            <div style={{ fontSize: 32, marginBottom: 10 }}>🗑</div>
            <p style={{ fontSize: 14, fontWeight: 600, marginBottom: 6 }}>
              Delete "{deleteConfirm.title}"?
            </p>
            <p style={{ fontSize: 12, color: "var(--text3)", lineHeight: 1.6 }}>
              This action cannot be undone.
            </p>
          </div>
        </Modal>
      )}
    </div>
  );
}

// ── Section header ─────────────────────────────────────────────────────────────
function Section({ label, color, bg, children }) {
  return (
    <div style={{ marginBottom: 16 }}>
      <div style={{
        display:      "flex",
        alignItems:   "center",
        gap:          8,
        marginBottom: 6,
        padding:      "4px 0",
      }}>
        <span style={{
          fontSize:      9,
          fontWeight:    700,
          color,
          textTransform: "uppercase",
          letterSpacing: "0.1em",
        }}>
          {label}
        </span>
        <div style={{ flex: 1, height: 1, background: "var(--border)" }} />
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
        {children}
      </div>
    </div>
  );
}