/**
 * components/pipeline/KanbanColumn.jsx
 *
 * One vertical column for a pipeline stage.
 *
 * Changes:
 *  - No per-column scroll — column expands to full content height
 *  - Drop zone for drag-and-drop stage change
 *  - Width reduced to 160px so all 7 stages fit without horizontal scroll
 */
import { useState } from "react";
import KanbanCard   from "./KanbanCard";
import { STAGE_META } from "@/utils/formatters";
import { useToast }   from "@/components/common/Toast";
import { useChangeStage } from "@/hooks/useLeads";

export default function KanbanColumn({ stage, data, onAssign, onEdit, isMobile = false }) {
  const meta    = STAGE_META[stage];
  const leads   = data?.leads ?? [];
  const count   = data?.count ?? 0;

  const toast       = useToast();
  const changeStage = useChangeStage();

  const [dragOver, setDragOver] = useState(false);

  // ── Drop handlers ──────────────────────────────────────────────────────────
  const handleDragOver = (e) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
    setDragOver(true);
  };

  const handleDragLeave = (e) => {
    // Only clear if leaving the column entirely
    if (!e.currentTarget.contains(e.relatedTarget)) {
      setDragOver(false);
    }
  };

  const handleDrop = async (e) => {
    e.preventDefault();
    setDragOver(false);
    const leadId    = e.dataTransfer.getData("lead_id");
    const fromStage = e.dataTransfer.getData("lead_stage");
    if (!leadId || fromStage === stage) return;
    try {
      await changeStage.mutateAsync({ id: leadId, stage });
      toast.success(`Moved to ${meta?.label ?? stage}`);
    } catch {
      toast.error("Could not move lead.");
    }
  };

  return (
    <div
      style={{
        flexShrink:    0,
        width:         isMobile ? "100%" : 160,
        display:       "flex",
        flexDirection: "column",
      }}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
    >
      {/* Column header */}
      <div style={{ marginBottom: 8, flexShrink: 0 }}>
        {/* Color bar */}
        <div style={{
          height:       3,
          borderRadius: 3,
          background:   meta.color,
          marginBottom: 7,
          opacity:      0.8,
        }} />

        <div style={{
          display:        "flex",
          alignItems:     "center",
          justifyContent: "space-between",
        }}>
          <span style={{
            fontSize:      10,
            fontWeight:    700,
            textTransform: "uppercase",
            letterSpacing: "0.07em",
            color:         meta.color,
          }}>
            {meta.label}
          </span>
          <span style={{
            fontSize:     10,
            fontWeight:   700,
            padding:      "1px 7px",
            borderRadius: 3,
            background:   meta.bg,
            color:        meta.color,
          }}>
            {count}
          </span>
        </div>
      </div>

      {/* Drop zone — cards area, no per-column scroll */}
      <div
        style={{
          flex:         1,
          minHeight:    60,
          borderRadius: 4,
          padding:      dragOver ? "4px" : "0",
          background:   dragOver ? meta.bg + "80" : "transparent",
          border:       dragOver
            ? `2px dashed ${meta.color}`
            : "2px dashed transparent",
          transition:   "all 0.15s",
        }}
      >
        {leads.length === 0 ? (
          <div style={{
            padding:      "16px 8px",
            textAlign:    "center",
            border:       dragOver ? "none" : "2px dashed var(--border)",
            borderRadius: 4,
            color:        "var(--text3)",
            fontSize:     11,
            background:   dragOver ? "transparent" : "var(--surface)",
          }}>
            {dragOver ? `Drop here →` : "No leads"}
          </div>
        ) : (
          leads.map((lead) => (
            <KanbanCard
              key={lead.id}
              lead={lead}
              onAssign={onAssign}
              onEdit={onEdit}
            />
          ))
        )}
      </div>
    </div>
  );
}