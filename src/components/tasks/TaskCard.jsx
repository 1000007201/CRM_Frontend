/**
 * components/tasks/TaskCard.jsx
 *
 * A single task row/card used in:
 *   - Lead Detail tasks tab
 *   - My Tasks page
 *   - Dashboard widget
 *
 * Shows:
 *   - Status toggle (complete/reopen)
 *   - Title (struck-through if completed)
 *   - Due date + time (red if overdue)
 *   - Priority badge
 *   - Assigned to avatar
 *   - Edit + Delete actions (if user has permission)
 *
 * Props:
 *   task       — task object from API
 *   onEdit     — called with task object to open edit modal
 *   onDelete   — called with task object to confirm deletion
 *   compact    — if true, shows a tighter layout (for dashboard widget)
 *   showLead   — if true, shows linked lead name (for My Tasks page)
 */
import { Link }        from "react-router-dom";
import Avatar          from "@/components/common/Avatar";
import TaskStatusToggle from "./TaskStatusToggle";
import { useAuth }     from "@/hooks/useAuth";
import { isAdminOrManager } from "@/utils/roles";
import { TASK_PRIORITY_META, TASK_STATUS_META, formatDate } from "@/utils/formatters";
import { STAGE_MAP }   from "@/utils/leadConstants";

export default function TaskCard({
  task,
  onEdit,
  onDelete,
  compact   = false,
  showLead  = false,
}) {
  const { user } = useAuth();
  const canManage = isAdminOrManager(user);

  const isOverdue   = task.is_overdue;
  const isCompleted = task.status === "completed";
  const isCancelled = task.status === "cancelled";
  const isDone      = isCompleted || isCancelled;

  const priority = TASK_PRIORITY_META[task.priority];
  const status   = TASK_STATUS_META[task.status];

  // Can edit: owner, creator, manager, admin
  const canEdit =
    canManage ||
    task.assigned_to === user?.id ||
    task.created_by  === user?.id;

  // Format due date/time
  const dueDisplay = task.due_date
    ? task.due_time
      ? `${formatDate(task.due_date)} at ${task.due_time.slice(0, 5)}`
      : formatDate(task.due_date)
    : "—";

  return (
    <div style={{
      display:      "flex",
      alignItems:   compact ? "center" : "flex-start",
      gap:          10,
      padding:      compact ? "8px 12px" : "12px 14px",
      background:   isDone ? "var(--surface)" : "var(--white)",
      border:       `1px solid ${
        isOverdue && !isDone
          ? "#F0A8A8"
          : isDone
          ? "var(--border)"
          : "var(--border)"
      }`,
      borderLeft:   `3px solid ${
        isOverdue && !isDone ? "#C03030"
        : isCompleted        ? "#18A858"
        : isCancelled        ? "var(--border2)"
        : priority?.color    ?? "var(--accent)"
      }`,
      borderRadius: 3,
      opacity:      isDone ? 0.65 : 1,
      transition:   "opacity 0.15s",
    }}>

      {/* Status toggle */}
      <TaskStatusToggle task={task} size={compact ? "sm" : "md"} />

      {/* Main content */}
      <div style={{ flex: 1, minWidth: 0 }}>
        {/* Title */}
        <p style={{
          fontSize:       compact ? 12 : 13,
          fontWeight:     600,
          color:          isDone ? "var(--text3)" : "var(--text)",
          textDecoration: isCompleted ? "line-through" : "none",
          marginBottom:   compact ? 0 : 4,
          overflow:       "hidden",
          textOverflow:   "ellipsis",
          whiteSpace:     "nowrap",
        }}>
          {task.title}
        </p>

        {/* Meta row */}
        {!compact && (
          <div style={{
            display:    "flex",
            alignItems: "center",
            gap:        8,
            flexWrap:   "wrap",
            marginTop:  2,
          }}>
            {/* Due date */}
            <span style={{
              fontSize:   10,
              fontWeight: 500,
              color:      isOverdue && !isDone ? "#C03030" : "var(--text3)",
            }}>
              {isOverdue && !isDone ? "⚠ " : ""}
              {dueDisplay}
            </span>

            {/* Priority badge */}
            <span style={{
              fontSize:     10,
              fontWeight:   500,
              padding:      "1px 6px",
              borderRadius: 3,
              background:   priority?.bg,
              color:        priority?.color,
              border:       `1px solid ${priority?.border}`,
            }}>
              {priority?.label}
            </span>

            {/* Linked lead */}
            {showLead && task.lead_title && (
              <div style={{ display: "flex", alignItems: "center", gap: 4, flexWrap: "wrap" }}>
                {task.lead ? (
                  <Link
                    to={`/leads/${task.lead}`}
                    onClick={(e) => e.stopPropagation()}
                    style={{
                      fontSize:       10,
                      color:          "var(--accent)",
                      fontWeight:     500,
                      background:     "var(--accent-lt)",
                      padding:        "1px 6px",
                      borderRadius:   3,
                      border:         "1px solid #F0D080",
                      maxWidth:       140,
                      overflow:       "hidden",
                      textOverflow:   "ellipsis",
                      whiteSpace:     "nowrap",
                      textDecoration: "none",
                    }}
                  >
                    ◈ {task.lead_title}
                  </Link>
                ) : (
                  <span style={{
                    fontSize:     10,
                    color:        "var(--accent)",
                    fontWeight:   500,
                    background:   "var(--accent-lt)",
                    padding:      "1px 6px",
                    borderRadius: 3,
                    border:       "1px solid #F0D080",
                    maxWidth:     140,
                    overflow:     "hidden",
                    textOverflow: "ellipsis",
                    whiteSpace:   "nowrap",
                  }}>
                    ◈ {task.lead_title}
                  </span>
                )}
                {task.lead_stage && STAGE_MAP[task.lead_stage] && (
                  <span style={{
                    fontSize:     10,
                    fontWeight:   600,
                    padding:      "1px 5px",
                    borderRadius: 3,
                    background:   STAGE_MAP[task.lead_stage].bg,
                    color:        STAGE_MAP[task.lead_stage].color,
                    border:       `1px solid ${STAGE_MAP[task.lead_stage].border}`,
                  }}>
                    {STAGE_MAP[task.lead_stage].label}
                  </span>
                )}
              </div>
            )}

            {/* Assigned to */}
            {task.assigned_to_name && (
              <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
                <Avatar name={task.assigned_to_name} size={16} />
                <span style={{ fontSize: 10, color: "var(--text3)" }}>
                  {task.assigned_to_name.split(" ")[0]}
                </span>
              </div>
            )}
          </div>
        )}

        {/* Compact: just due date */}
        {compact && (
          <p style={{
            fontSize: 10,
            color:    isOverdue && !isDone ? "#C03030" : "var(--text3)",
            marginTop: 1,
          }}>
            {isOverdue && !isDone ? "⚠ Overdue · " : ""}{dueDisplay}
          </p>
        )}
      </div>

      {/* Actions — edit + delete */}
      {canEdit && !compact && (
        <div style={{ display: "flex", gap: 4, flexShrink: 0 }}>
          <ActionBtn
            label="Edit"
            color="var(--accent)"
            onClick={(e) => { e.stopPropagation(); onEdit?.(task); }}
          />
          {(canManage || task.created_by === user?.id) && (
            <ActionBtn
              label="Delete"
              color="var(--red)"
              onClick={(e) => { e.stopPropagation(); onDelete?.(task); }}
            />
          )}
        </div>
      )}
    </div>
  );
}

function ActionBtn({ label, color, onClick }) {
  return (
    <button
      onClick={onClick}
      style={{
        padding:      "3px 8px",
        borderRadius: 3,
        border:       "1px solid var(--border2)",
        background:   "none",
        fontSize:     10,
        fontWeight:   500,
        color:        "var(--text3)",
        cursor:       "pointer",
        transition:   "all 0.12s",
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.background  = color + "12";
        e.currentTarget.style.borderColor = color + "60";
        e.currentTarget.style.color       = color;
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.background  = "none";
        e.currentTarget.style.borderColor = "var(--border2)";
        e.currentTarget.style.color       = "var(--text3)";
      }}
    >
      {label}
    </button>
  );
}