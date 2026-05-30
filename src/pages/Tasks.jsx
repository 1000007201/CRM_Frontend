/**
 * pages/Tasks.jsx
 *
 * Unified task list — single view, no My/Team tab switcher.
 * User filter comes from UserFilterContext (shared across Sales CRM tabs).
 *
 * When selectedIds is empty → useTeamTasks with no assigned_to (backend role-scopes)
 * When selectedIds has values → useTeamTasks with assigned_to = comma-separated IDs
 *
 * Layout:
 *  ┌────────────────────────────────────────────────────────┐
 *  │ Tasks                         [+ Add Task]             │
 *  │ 3 pending · 1 overdue                                  │
 *  ├──────────────┬─────────────────────────────────────────┤
 *  │ Date filters │ Status  Priority                        │
 *  │ [Today]      │                                         │
 *  │ [This Week]  │  ⚠ OVERDUE (1)                          │
 *  │ [This Month] │  ┌─────────────────────────────────────┐│
 *  │ [All]        │  │ ☐ Call Suresh Kumar  ⚠ yesterday   ││
 *  │              │  └─────────────────────────────────────┘│
 *  │ [Custom]     │                                         │
 *  │  From: ____  │  PENDING (2)                            │
 *  │  To:   ____  │                                         │
 *  └──────────────┴─────────────────────────────────────────┘
 */
import { useState, useMemo } from "react";
import { useAuth }           from "@/hooks/useAuth";
import { useTeamTasks }      from "@/hooks/useTasks";
import { useUserFilter }     from "@/context/UserFilterContext";

import TaskList   from "@/components/tasks/TaskList";
import TaskForm   from "@/components/tasks/TaskForm";
import Spinner    from "@/components/common/Spinner";
import UserFilterBar from "@/components/common/UserFilterBar";

// ── Date preset helpers ────────────────────────────────────────────────────────
function todayStr() {
  return new Date().toISOString().split("T")[0];
}

function addDays(n) {
  const d = new Date();
  d.setDate(d.getDate() + n);
  return d.toISOString().split("T")[0];
}

function startOfMonth() {
  const d = new Date();
  d.setDate(1);
  return d.toISOString().split("T")[0];
}

function endOfMonth() {
  const d = new Date();
  d.setMonth(d.getMonth() + 1, 0);
  return d.toISOString().split("T")[0];
}

const PRESETS = [
  {
    id:    "overdue",
    label: "Overdue",
    color: "#C03030",
    bg:    "#FCE8E8",
    build: () => ({ overdue: "true" }),
  },
  {
    id:    "today",
    label: "Today",
    color: "#1A5A9A",
    bg:    "#E8F2FC",
    build: () => ({ due_date: todayStr() }),
  },
  {
    id:    "this_week",
    label: "This Week",
    color: "#7A4A00",
    bg:    "#FDF4E0",
    build: () => ({ due_date_after: todayStr(), due_date_before: addDays(7) }),
  },
  {
    id:    "this_month",
    label: "This Month",
    color: "#6030A0",
    bg:    "#EEE0F8",
    build: () => ({ due_date_after: startOfMonth(), due_date_before: endOfMonth() }),
  },
  {
    id:    "all",
    label: "All Tasks",
    color: "#5A5A50",
    bg:    "#F0EFE8",
    build: () => ({}),
  },
];

export default function TasksPage() {
  const { user } = useAuth();

  // ── Shared user filter ────────────────────────────────────────────────────
  const { selectedIds } = useUserFilter();
  const assignedToParam = useMemo(
    () => selectedIds.size > 0 ? [...selectedIds].join(",") : undefined,
    [selectedIds]
  );

  // ── Date preset ───────────────────────────────────────────────────────────
  const [preset,     setPreset]     = useState("all");
  const [customFrom, setCustomFrom] = useState("");
  const [customTo,   setCustomTo]   = useState("");
  const [showCustom, setShowCustom] = useState(false);

  // ── Add Task modal ────────────────────────────────────────────────────────
  const [showCreate, setShowCreate] = useState(false);

  // ── Build API params from preset + user filter ────────────────────────────
  const apiParams = useMemo(() => {
    const dateParams = (() => {
      if (preset === "custom") {
        const p = {};
        if (customFrom) p.due_date_after  = customFrom;
        if (customTo)   p.due_date_before = customTo;
        return p;
      }
      const found = PRESETS.find((p) => p.id === preset);
      return found ? found.build() : {};
    })();

    return assignedToParam
      ? { ...dateParams, assigned_to: assignedToParam }
      : dateParams;
  }, [preset, customFrom, customTo, assignedToParam]);

  // ── Data — single unified task list ──────────────────────────────────────
  const {
    data: tasks = [],
    isLoading: loading,
    refetch,
  } = useTeamTasks(apiParams);

  // ── Summary counts ────────────────────────────────────────────────────────
  const pendingCount = tasks.filter(
    (t) => t.status === "pending" || t.status === "in_progress"
  ).length;
  const overdueCount = tasks.filter((t) => t.is_overdue).length;

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <div>
      {/* Page header */}
      <div className="page-header">
        <div>
          <h1 className="page-title">Tasks</h1>
          <p className="page-subtitle">
            {loading
              ? "Loading…"
              : [
                  pendingCount > 0 && `${pendingCount} pending`,
                  overdueCount > 0 && `${overdueCount} overdue`,
                ].filter(Boolean).join(" · ") || "No pending tasks"}
          </p>
        </div>
        <button className="btn btn-primary" onClick={() => setShowCreate(true)}>
          + Add Task
        </button>
      </div>

      {/* Shared user filter bar */}
      <UserFilterBar />

      {/* Main layout: date filter sidebar + task list */}
      <div style={{
        display:             "grid",
        gridTemplateColumns: "180px 1fr",
        gap:                 16,
        alignItems:          "start",
      }}>

        {/* ── Date filter sidebar ── */}
        <div className="card" style={{ padding: 0, overflow: "hidden" }}>
          <div style={{
            padding:      "10px 12px",
            borderBottom: "1px solid var(--border)",
            fontSize:     9,
            fontWeight:   700,
            color:        "var(--text3)",
            textTransform: "uppercase",
            letterSpacing: "0.1em",
          }}>
            Date Filter
          </div>

          <div style={{ padding: "6px 0" }}>
            {PRESETS.map((p) => (
              <button
                key={p.id}
                onClick={() => { setPreset(p.id); setShowCustom(false); }}
                style={{
                  display:    "flex",
                  alignItems: "center",
                  gap:        8,
                  width:      "100%",
                  padding:    "8px 14px",
                  border:     "none",
                  background: preset === p.id ? p.bg : "none",
                  cursor:     "pointer",
                  textAlign:  "left",
                  transition: "background 0.1s",
                  fontFamily: "inherit",
                  borderLeft: preset === p.id
                    ? `3px solid ${p.color}`
                    : "3px solid transparent",
                }}
                onMouseEnter={(e) => {
                  if (preset !== p.id)
                    e.currentTarget.style.background = "var(--bg-hover)";
                }}
                onMouseLeave={(e) => {
                  if (preset !== p.id)
                    e.currentTarget.style.background = "none";
                }}
              >
                <span style={{
                  fontSize:   12,
                  fontWeight: preset === p.id ? 700 : 400,
                  color:      preset === p.id ? p.color : "var(--text2)",
                }}>
                  {p.label}
                </span>
              </button>
            ))}

            {/* Custom range */}
            <button
              onClick={() => { setPreset("custom"); setShowCustom(true); }}
              style={{
                display:    "flex",
                alignItems: "center",
                gap:        8,
                width:      "100%",
                padding:    "8px 14px",
                border:     "none",
                background: preset === "custom" ? "#F0EFE8" : "none",
                cursor:     "pointer",
                textAlign:  "left",
                fontFamily: "inherit",
                borderLeft: preset === "custom"
                  ? "3px solid var(--text2)"
                  : "3px solid transparent",
              }}
            >
              <span style={{
                fontSize:   12,
                fontWeight: preset === "custom" ? 700 : 400,
                color:      preset === "custom" ? "var(--text)" : "var(--text2)",
              }}>
                Custom Range
              </span>
            </button>

            {showCustom && (
              <div style={{ padding: "8px 14px", display: "flex", flexDirection: "column", gap: 6 }}>
                <div className="form-group">
                  <label className="form-label">From</label>
                  <input
                    type="date"
                    className="form-input"
                    value={customFrom}
                    onChange={(e) => setCustomFrom(e.target.value)}
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">To</label>
                  <input
                    type="date"
                    className="form-input"
                    value={customTo}
                    onChange={(e) => setCustomTo(e.target.value)}
                  />
                </div>
              </div>
            )}
          </div>
        </div>

        {/* ── Task list ── */}
        <div className="card" style={{ padding: "14px 16px" }}>
          {loading ? (
            <Spinner center />
          ) : (
            <TaskList
              tasks={tasks}
              loading={false}
              showLead
              showAdd
              onRefresh={refetch}
            />
          )}
        </div>
      </div>

      {/* Add task modal */}
      {showCreate && (
        <TaskForm
          onClose={() => setShowCreate(false)}
          onSaved={() => { setShowCreate(false); refetch(); }}
        />
      )}
    </div>
  );
}
