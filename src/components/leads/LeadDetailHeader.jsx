/**
 * components/leads/LeadDetailHeader.jsx
 *
 * Top section of the lead detail page:
 *  - Lead title + contact name
 *  - Stage stepper (clickable steps for admin/manager)
 *  - Priority + source badges
 *  - Action buttons: Edit, Assign, Delete
 */
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { StageBadge, PriorityBadge } from "@/components/common/Badge";
import { useToast }       from "@/components/common/Toast";
import { useChangeStage } from "@/hooks/useLeads";
import { isAdminOrManager } from "@/utils/roles";
import { useAuth }          from "@/hooks/useAuth";
import { STAGE_META, SOURCE_LABELS } from "@/utils/formatters";

const STAGES = Object.keys(STAGE_META);

export default function LeadDetailHeader({ lead, onEdit, onAssign, onDelete }) {
  const { user }   = useAuth();
  const toast      = useToast();
  const navigate   = useNavigate();
  const canManage  = isAdminOrManager(user);
  const [changing, setChanging] = useState(false);
  const changeMutation = useChangeStage();

  const currentIdx = STAGES.indexOf(lead.stage);

  const handleStageClick = async (stage) => {
    if (!canManage || stage === lead.stage) return;
    setChanging(true);
    try {
      await changeMutation.mutateAsync({ id: lead.id, stage });
      toast.success(`Stage → ${STAGE_META[stage]?.label ?? stage}`);
    } catch {
      toast.error("Could not update stage.");
    } finally {
      setChanging(false);
    }
  };

  return (
    <div className="card" style={{ marginBottom: 16 }}>
      <div style={{ padding: "20px 24px" }}>

        {/* Top row: breadcrumb + actions */}
        <div style={{
          display: "flex", alignItems: "center",
          justifyContent: "space-between", marginBottom: 16,
          flexWrap: "wrap", gap: 10,
        }}>
          {/* Breadcrumb */}
          <button
            onClick={() => navigate("/leads")}
            className="btn btn-ghost btn-sm"
            style={{ color: "var(--text3)", padding: "4px 8px" }}
          >
            ← Back to Leads
          </button>

          {/* Action buttons */}
          <div style={{ display: "flex", gap: 8 }}>
            <button className="btn btn-secondary btn-sm" onClick={onEdit}>
              ✎ Edit
            </button>
            {canManage && (
              <button className="btn btn-secondary btn-sm" onClick={onAssign}
                style={{ color: "#3A80D0", borderColor: "#A8C8F0" }}>
                ◎ {lead.assigned_to ? "Reassign" : "Assign"}
              </button>
            )}
            {canManage && (
              <button className="btn btn-danger btn-sm" onClick={onDelete}>
                🗑 Delete
              </button>
            )}
          </div>
        </div>

        {/* Lead title + meta */}
        <div style={{ marginBottom: 20 }}>
          <h1 style={{
            fontSize: 18, fontWeight: 700,
            letterSpacing: "-0.02em", marginBottom: 6,
          }}>
            {lead.title}
          </h1>
          <div style={{ display: "flex", gap: 10, flexWrap: "wrap", alignItems: "center" }}>
            <StageBadge    stage={lead.stage} />
            <PriorityBadge priority={lead.priority} />
            <span style={{ fontSize: 12, color: "var(--text3)" }}>
              {SOURCE_LABELS[lead.source] ?? lead.source}
            </span>
          </div>
        </div>

        {/* Stage stepper */}
        <div>
          <p style={{
            fontSize: 10, fontWeight: 700, color: "var(--text3)",
            textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 10,
          }}>
            Pipeline Stage
          </p>
          <div style={{
            display: "flex", alignItems: "center",
            gap: 0, overflowX: "auto",
          }}>
            {STAGES.map((stage, idx) => {
              const meta      = STAGE_META[stage] ?? { label: stage, color: "#9CA3AF", bg: "#F3F4F6", border: "#D1D5DB" };
              const isActive  = stage === lead.stage;
              const isDone    = idx < currentIdx;
              const isLost    = stage === "lost";

              return (
                <div key={stage} style={{ display: "flex", alignItems: "center" }}>
                  {/* Step */}
                  <button
                    onClick={() => handleStageClick(stage)}
                    disabled={!canManage || changing}
                    title={canManage ? `Set stage to ${meta.label}` : meta.label}
                    style={{
                      display:       "flex",
                      flexDirection: "column",
                      alignItems:    "center",
                      gap:           4,
                      padding:       "6px 12px",
                      borderRadius:  "var(--radius)",
                      border:        isActive ? `2px solid ${meta.color}` : "2px solid transparent",
                      background:    isActive ? meta.bg : isDone ? meta.bg + "60" : "none",
                      cursor:        canManage && !changing ? "pointer" : "default",
                      transition:    "all 0.15s",
                      minWidth:      64,
                      opacity:       changing ? 0.6 : 1,
                    }}
                    onMouseEnter={(e) => {
                      if (canManage && !isActive)
                        e.currentTarget.style.background = meta.bg;
                    }}
                    onMouseLeave={(e) => {
                      if (!isActive)
                        e.currentTarget.style.background = isDone ? meta.bg + "60" : "none";
                    }}
                  >
                    {/* Dot */}
                    <div style={{
                      width:        10,
                      height:       10,
                      borderRadius: "50%",
                      background:   isActive || isDone ? meta.color : "var(--border)",
                      flexShrink:   0,
                    }} />
                    {/* Label */}
                    <span style={{
                      fontSize:   10,
                      fontWeight: isActive ? 700 : 500,
                      color:      isActive ? meta.color : isDone ? meta.color + "cc" : "var(--text3)",
                      whiteSpace: "nowrap",
                    }}>
                      {meta.label}
                    </span>
                  </button>

                  {/* Connector line — not after last item */}
                  {idx < STAGES.length - 1 && (
                    <div style={{
                      width:      20,
                      height:     2,
                      background: idx < currentIdx ? "var(--accent)" : "var(--border)",
                      flexShrink: 0,
                      transition: "background 0.3s",
                    }} />
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}