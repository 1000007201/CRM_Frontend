/**
 * components/dashboard/TaskDashboardWidget.jsx
 *
 * Dashboard widget showing:
 *   - Overdue tasks (red, urgent)
 *   - Tasks due today
 *   - Upcoming tasks (next 7 days)
 *
 * Clicking any task navigates to the My Tasks page.
 * Clicking "View All" goes to My Tasks page.
 * Compact layout using TaskCard with compact=true.
 */
import { useNavigate }  from "react-router-dom";
import TaskCard         from "@/components/tasks/TaskCard";
import Spinner          from "@/components/common/Spinner";
import EmptyState       from "@/components/common/EmptyState";
import { formatDate }   from "@/utils/formatters";

export default function TaskDashboardWidget({ overdue = [], upcoming = [], loading }) {
  const navigate = useNavigate();

  const todayStr  = new Date().toISOString().split("T")[0];
  const todayTasks = upcoming.filter((t) => t.due_date === todayStr);
  const laterTasks = upcoming.filter((t) => t.due_date >  todayStr);

  const totalCount = overdue.length + upcoming.length;
  const overdueCount = overdue.length;

  return (
    <div className="card">
      {/* Header */}
      <div className="card-header">
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <span className="card-title">My Tasks</span>
          {overdueCount > 0 && (
            <span style={{
              fontSize:     10,
              fontWeight:   700,
              padding:      "1px 7px",
              borderRadius: 3,
              background:   "#FCE8E8",
              color:        "#C03030",
              border:       "1px solid #F0A8A8",
            }}>
              {overdueCount} overdue
            </span>
          )}
        </div>
        <button
          className="btn btn-secondary btn-sm"
          onClick={() => navigate("/tasks")}
        >
          View All →
        </button>
      </div>

      {/* Content */}
      {loading ? (
        <Spinner center />
      ) : totalCount === 0 ? (
        <EmptyState
          icon="☑"
          title="All caught up!"
          subtitle="No overdue or upcoming tasks"
        />
      ) : (
        <div style={{ padding: "8px 0" }}>

          {/* Overdue section */}
          {overdue.length > 0 && (
            <WidgetSection
              label={`Overdue (${overdue.length})`}
              color="#C03030"
              bg="#FCE8E8"
            >
              {overdue.slice(0, 3).map((task) => (
                <WidgetTaskRow
                  key={task.id}
                  task={task}
                  onClick={() => navigate("/tasks")}
                />
              ))}
              {overdue.length > 3 && (
                <MoreBtn
                  count={overdue.length - 3}
                  onClick={() => navigate("/tasks")}
                />
              )}
            </WidgetSection>
          )}

          {/* Due today */}
          {todayTasks.length > 0 && (
            <WidgetSection
              label={`Due Today (${todayTasks.length})`}
              color="#1A5A9A"
              bg="#E8F2FC"
            >
              {todayTasks.slice(0, 3).map((task) => (
                <WidgetTaskRow
                  key={task.id}
                  task={task}
                  onClick={() => navigate("/tasks")}
                />
              ))}
              {todayTasks.length > 3 && (
                <MoreBtn
                  count={todayTasks.length - 3}
                  onClick={() => navigate("/tasks")}
                />
              )}
            </WidgetSection>
          )}

          {/* Upcoming (next 7 days, not today) */}
          {laterTasks.length > 0 && (
            <WidgetSection
              label={`Upcoming (${laterTasks.length})`}
              color="#5A5A50"
              bg="#F0EFE8"
            >
              {laterTasks.slice(0, 3).map((task) => (
                <WidgetTaskRow
                  key={task.id}
                  task={task}
                  onClick={() => navigate("/tasks")}
                />
              ))}
              {laterTasks.length > 3 && (
                <MoreBtn
                  count={laterTasks.length - 3}
                  onClick={() => navigate("/tasks")}
                />
              )}
            </WidgetSection>
          )}

        </div>
      )}
    </div>
  );
}

// ── Sub-components ─────────────────────────────────────────────────────────────

function WidgetSection({ label, color, bg, children }) {
  return (
    <div style={{ marginBottom: 4 }}>
      {/* Section label */}
      <div style={{
        display:      "flex",
        alignItems:   "center",
        gap:          8,
        padding:      "6px 14px 4px",
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
      <div style={{ display: "flex", flexDirection: "column", gap: 1 }}>
        {children}
      </div>
    </div>
  );
}

function WidgetTaskRow({ task, onClick }) {
  const isOverdue   = task.is_overdue;
  const isCompleted = task.status === "completed";

  return (
    <div
      onClick={onClick}
      style={{
        display:     "flex",
        alignItems:  "center",
        gap:         10,
        padding:     "7px 14px",
        cursor:      "pointer",
        transition:  "background 0.1s",
        borderLeft:  `3px solid ${isOverdue ? "#C03030" : "transparent"}`,
      }}
      onMouseEnter={(e) => e.currentTarget.style.background = "var(--bg-hover)"}
      onMouseLeave={(e) => e.currentTarget.style.background = "transparent"}
    >
      {/* Status dot */}
      <div style={{
        width:        8,
        height:       8,
        borderRadius: "50%",
        background:   isOverdue   ? "#C03030"
                    : isCompleted ? "#18A858"
                    : "var(--border2)",
        flexShrink:   0,
      }} />

      {/* Title */}
      <p style={{
        flex:          1,
        fontSize:      12,
        fontWeight:    500,
        color:         isCompleted ? "var(--text3)" : "var(--text)",
        textDecoration: isCompleted ? "line-through" : "none",
        overflow:      "hidden",
        textOverflow:  "ellipsis",
        whiteSpace:    "nowrap",
      }}>
        {task.title}
      </p>

      {/* Due date */}
      <span style={{
        fontSize:   10,
        color:      isOverdue ? "#C03030" : "var(--text3)",
        fontWeight: isOverdue ? 600 : 400,
        flexShrink: 0,
      }}>
        {task.due_date ? formatDate(task.due_date) : ""}
      </span>
    </div>
  );
}

function MoreBtn({ count, onClick }) {
  return (
    <button
      onClick={onClick}
      style={{
        display:    "block",
        width:      "100%",
        padding:    "5px 14px",
        border:     "none",
        background: "none",
        fontSize:   11,
        color:      "var(--accent)",
        cursor:     "pointer",
        textAlign:  "left",
        fontFamily: "inherit",
        fontWeight: 500,
      }}
    >
      + {count} more →
    </button>
  );
}