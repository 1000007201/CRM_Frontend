/**
 * pages/LeadDetail.jsx
 *
 * Two-column layout:
 *
 *  LEFT (narrow)                RIGHT (wide)
 *  ─────────────────────────    ─────────────────────────────────────
 *  LeadDetailHeader             Tabs: Activity | Notes | History
 *  (stage stepper, actions)
 *  LeadInfo
 *  (contact, deal, ownership)
 *
 * Modals: Edit, Assign, Delete (same ones used on the Leads page)
 */
import { useState }            from "react";
import { useParams, useNavigate } from "react-router-dom";

import { useLead }       from "@/hooks/useLeads";
import { useIsMobile }   from "@/hooks/useIsMobile";
import Spinner           from "@/components/common/Spinner";
import LeadDetailHeader  from "@/components/leads/LeadDetailHeader";
import LeadInfo          from "@/components/leads/LeadInfo";
import NotesPanel        from "@/components/leads/NotesPanel";
import ActivityTimeline  from "@/components/leads/ActivityTimeline";
import AssignmentHistory from "@/components/leads/AssignmentHistory";
import TaskList          from "@/components/tasks/TaskList";
import { useLeadTasks }  from "@/hooks/useTasks";
import LeadForm          from "@/components/leads/LeadForm";
import AssignModal       from "@/components/leads/AssignModal";
import DeleteConfirm     from "@/components/leads/DeleteConfirm";

const TABS = [
  { id: "tasks",    label: "Tasks",             icon: "☐" },
  { id: "activity", label: "Activity",           icon: "◷" },
  { id: "notes",    label: "Notes",              icon: "✉" },
  { id: "history",  label: "Assignment History", icon: "◎" },
];

export default function LeadDetailPage() {
  const { id }       = useParams();
  const navigate     = useNavigate();
  const isMobile     = useIsMobile();
  const [tab, setTab] = useState("tasks");

  // ── Modals ──────────────────────────────────────────────────────────────
  const [showEdit,   setShowEdit]   = useState(false);
  const [showAssign, setShowAssign] = useState(false);
  const [showDelete, setShowDelete] = useState(false);

  // ── Data ────────────────────────────────────────────────────────────────
  const { data: lead, isLoading, isError } = useLead(id);
  const { data: leadTasks = [], isLoading: tasksLoading, refetch: refetchTasks } = useLeadTasks(id);

  // ── Loading / error states ───────────────────────────────────────────────
  if (isLoading) return <Spinner center />;

  if (isError || !lead) return (
    <div style={{ textAlign: "center", padding: "60px 24px" }}>
      <div style={{ fontSize: 40, marginBottom: 12 }}>⚠</div>
      <h2 style={{ marginBottom: 8 }}>Lead not found</h2>
      <p style={{ color: "var(--text3)", marginBottom: 20 }}>
        This lead may have been deleted or you don't have permission to view it.
      </p>
      <button className="btn btn-primary" onClick={() => navigate("/leads")}>
        ← Back to Leads
      </button>
    </div>
  );

  return (
    <div style={{
      display: "grid",
      gridTemplateColumns: isMobile ? "1fr" : "340px 1fr",
      gap: 16,
      alignItems: "start",
    }}>

      {/* ── LEFT COLUMN ── */}
      <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
        {/* Header: stage stepper + action buttons */}
        <LeadDetailHeader
          lead={lead}
          onEdit={()   => setShowEdit(true)}
          onAssign={()  => setShowAssign(true)}
          onDelete={()  => setShowDelete(true)}
        />

        {/* Info panel */}
        <div className="card">
          <LeadInfo lead={lead} />
        </div>
      </div>

      {/* ── RIGHT COLUMN ── */}
      <div className="card">
        {/* Tabs */}
        <div
          className={isMobile ? "hide-scrollbar" : undefined}
          style={{
            display:      "flex",
            borderBottom: "1px solid var(--border)",
            padding:      "0 4px",
            overflowX:    isMobile ? "auto" : "visible",
            overflowY:    "hidden",
            WebkitOverflowScrolling: "touch",
        }}>
          {TABS.map((t) => (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              style={{
                display:        "flex",
                alignItems:     "center",
                gap:            6,
                padding:        isMobile ? "12px 14px" : "14px 16px",
                minHeight:      isMobile ? 44 : "auto",
                flexShrink:     0,
                border:         "none",
                borderBottom:   tab === t.id
                  ? "2px solid var(--accent)"
                  : "2px solid transparent",
                background:     "none",
                fontSize:       13,
                fontWeight:     tab === t.id ? 700 : 500,
                color:          tab === t.id ? "var(--accent)" : "var(--text3)",
                cursor:         "pointer",
                transition:     "all 0.15s",
                marginBottom:   -1,
                whiteSpace:     "nowrap",
              }}
            >
              <span>{t.icon}</span>
              {t.label}
              {/* Count badges */}
              {t.id === "tasks" && leadTasks.length > 0 && (
                <span style={{
                  fontSize:     10,
                  fontWeight:   700,
                  padding:      "1px 6px",
                  borderRadius: 3,
                  background:   tab === "tasks" ? "var(--accent)" : "var(--border)",
                  color:        tab === "tasks" ? "#fff" : "var(--text3)",
                }}>
                  {leadTasks.filter(t => t.status !== "completed" && t.status !== "cancelled").length}
                </span>
              )}
              {t.id === "notes" && lead.notes?.length > 0 && (
                <span style={{
                  fontSize:     10,
                  fontWeight:   700,
                  padding:      "1px 6px",
                  borderRadius: 3,
                  background:   tab === "notes" ? "var(--accent)" : "var(--border)",
                  color:        tab === "notes" ? "#fff" : "var(--text3)",
                }}>
                  {lead.notes.length}
                </span>
              )}
            </button>
          ))}
        </div>

        {/* Tab content */}
        <div style={{ padding: "20px" }}>
          {tab === "tasks"    && <TaskList tasks={leadTasks} loading={tasksLoading} leadId={id} onRefresh={refetchTasks} />}
          {tab === "activity" && <ActivityTimeline leadId={id} />}
          {tab === "notes"    && <NotesPanel        leadId={id} />}
          {tab === "history"  && <AssignmentHistory leadId={id} />}
        </div>
      </div>

      {/* ── Modals ── */}
      {showEdit && (
        <LeadForm
          lead={lead}
          onClose={() => setShowEdit(false)}
          onSaved={() => setShowEdit(false)}
        />
      )}

      {showAssign && (
        <AssignModal
          lead={lead}
          onClose={() => setShowAssign(false)}
        />
      )}

      {showDelete && (
        <DeleteConfirm
          lead={lead}
          onClose={() => setShowDelete(false)}
          redirectAfter
        />
      )}
    </div>
  );
}