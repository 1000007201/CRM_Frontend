/**
 * components/pipeline/KanbanCard.jsx
 *
 * Single lead card in the Kanban board.
 *
 * Changes from original:
 *  - Draggable (HTML5 drag-and-drop) — drag to another column to change stage
 *  - Stage selector on hover — quick stage change without leaving pipeline
 *  - No per-card value display (removed)
 */
import { useState } from "react";
import { useNavigate }    from "react-router-dom";
import Avatar             from "@/components/common/Avatar";
import { PriorityBadge }  from "@/components/common/Badge";
import { useToast }       from "@/components/common/Toast";
import { timeAgo, SOURCE_LABELS, STAGE_META } from "@/utils/formatters";
import { isAdminOrManager } from "@/utils/roles";
import { useAuth }          from "@/hooks/useAuth";
import { useUpdateLead, useAddNote } from "@/hooks/useLeads";

const STAGES = Object.keys(STAGE_META);

export default function KanbanCard({ lead, onAssign, onEdit, onDragStart }) {
  const navigate       = useNavigate();
  const { user }       = useAuth();
  const canManage      = isAdminOrManager(user);
  const toast          = useToast();
  const updateLead = useUpdateLead();

  const [hovered,  setHovered]  = useState(false);
  const [dragging, setDragging] = useState(false);

  // ── Note input ─────────────────────────────────────────────────────────────
  const addNote    = useAddNote();
  const [noteText, setNoteText] = useState("");

  const handleNoteKeyDown = async (e) => {
    if (e.key !== "Enter" || e.shiftKey) return;
    e.preventDefault();
    const text = noteText.trim();
    if (!text) return;
    try {
      await addNote.mutateAsync({ leadId: lead.id, content: text });
      toast.success("Note added");
      setNoteText("");
    } catch (err) {
      toast.error(err?.response?.data?.detail || "Failed to add note");
    }
  };

  // ── Stage change ───────────────────────────────────────────────────────────
  const visibleStages = STAGES.filter((s) => s !== "raw" || user?.role === "admin");

  const handleStageChange = async (e) => {
    e.stopPropagation();
    const newStage = e.target.value;
    if (newStage === lead.stage) return;
    try {
      await updateLead.mutateAsync({ id: lead.id, data: { stage: newStage } });
      toast.success(`Moved to ${STAGE_META[newStage]?.label ?? newStage}`);
    } catch {
      toast.error("Could not change stage.");
    }
  };

  // ── Drag handlers ──────────────────────────────────────────────────────────
  const handleDragStart = (e) => {
    setDragging(true);
    e.dataTransfer.effectAllowed = "move";
    e.dataTransfer.setData("lead_id",    lead.id);
    e.dataTransfer.setData("lead_stage", lead.stage);
    onDragStart?.(lead);
  };

  const handleDragEnd = () => setDragging(false);

  const meta = STAGE_META[lead.stage];

  return (
    <div
      draggable
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
      onClick={() => navigate(`/leads/${lead.id}`)}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        background:    "var(--white)",
        border:        `1px solid ${dragging ? "var(--accent)" : "var(--border)"}`,
        borderRadius:  4,
        padding:       "10px 12px",
        marginBottom:  6,
        cursor:        dragging ? "grabbing" : "grab",
        opacity:       dragging ? 0.5 : 1,
        boxShadow:     hovered && !dragging
          ? "0 4px 14px rgba(15,23,42,.10)"
          : "0 1px 3px rgba(15,23,42,.05)",
        transform:     hovered && !dragging ? "translateY(-1px)" : "none",
        transition:    "all 0.13s",
        userSelect:    "none",
        display:       "flex",
        flexDirection: "column",
        minHeight:     120,
      }}
    >
      {/* Title */}
      <p style={{
        fontSize:        12,
        fontWeight:      700,
        color:           "var(--text)",
        marginBottom:    2,
        lineHeight:      1.35,
        overflow:        "hidden",
        display:         "-webkit-box",
        WebkitLineClamp: 2,
        WebkitBoxOrient: "vertical",
      }}>
        {lead.contact_name}
      </p>

      {/* Company — always reserve row height so cards without a company match */}
      <div style={{ minHeight: 16, marginBottom: 6 }}>
        {lead.company && (
          <p style={{ fontSize: 10, color: "var(--text3)" }}>
            {lead.company}
          </p>
        )}
      </div>

      {/* Priority + source */}
      <div style={{
        display:    "flex",
        alignItems: "center",
        gap:        5,
        marginBottom: 8,
        flexWrap:   "wrap",
      }}>
        <PriorityBadge priority={lead.priority} />
        <span style={{
          fontSize:     9,
          color:        "var(--text3)",
          background:   "var(--surface)",
          border:       "1px solid var(--border)",
          borderRadius: 3,
          padding:      "1px 5px",
        }}>
          {SOURCE_LABELS[lead.source] ?? lead.source}
        </span>
      </div>

      {/* Footer: assigned rep + time — pinned to bottom */}
      <div style={{
        display:        "flex",
        alignItems:     "center",
        justifyContent: "space-between",
        gap:            6,
        marginTop:      "auto",
        paddingTop:     6,
      }}>
        {lead.assigned_to_name ? (
          <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
            <Avatar name={lead.assigned_to_name} size={18} />
            <span style={{ fontSize: 10, color: "var(--text3)" }}>
              {lead.assigned_to_name.split(" ")[0]}
            </span>
          </div>
        ) : (
          <span style={{
            fontSize:     9,
            fontWeight:   600,
            color:        "#92400e",
            background:   "#FDF4E0",
            border:       "1px solid #F0D080",
            borderRadius: 3,
            padding:      "1px 5px",
          }}>
            Unassigned
          </span>
        )}
        <span style={{ fontSize: 9, color: "var(--text3)" }}>
          {timeAgo(lead.created_at)}
        </span>
      </div>

      {/* Hover actions */}
      {hovered && (
        <div
          style={{
            marginTop:     8,
            paddingTop:    8,
            borderTop:     "1px solid var(--border)",
            display:       "flex",
            flexDirection: "column",
            gap:           6,
          }}
          onClick={(e) => e.stopPropagation()}
        >
          {/* Row 1: Stage dropdown — full width */}
          <select
            value={lead.stage}
            onChange={handleStageChange}
            onClick={(e) => e.stopPropagation()}
            disabled={updateLead.isPending}
            className="form-select"
            style={{
              width:        "100%",
              fontSize:     10,
              fontWeight:   600,
              padding:      "3px 4px",
              borderRadius: 3,
              background:   meta?.bg ?? "var(--surface)",
              color:        meta?.color ?? "var(--text)",
              cursor:       "pointer",
              fontFamily:   "inherit",
            }}
          >
            {visibleStages.map((s) => (
              <option key={s} value={s}>{STAGE_META[s]?.label ?? s}</option>
            ))}
          </select>

          {/* Row 2: Edit + Assign — split 50/50 */}
          {canManage && (
            <div style={{ display: "flex", flexDirection: "row", justifyContent: "space-between"}}>
              <QuickBtn
                label="Edit"
                color="var(--accent)"
                onClick={(e) => { e.stopPropagation(); onEdit(lead); }}
                className="btn btn-secondary btn-sm"
                style={{width: "35%"}}
              />
              <QuickBtn
                label={lead.assigned_to ? "Reassign" : "Assign"}
                color="#3A80D0"
                onClick={(e) => { e.stopPropagation(); onAssign(lead); }}
                className="btn btn-secondary btn-sm"
                style={{width: "60%"}}
              />
            </div>
          )}

          {/* Row 3: Note input — Enter to save */}
          <div
            draggable={false}
            onClick={(e) => e.stopPropagation()}
            onMouseDown={(e) => e.stopPropagation()}
            onDragStart={(e) => { e.preventDefault(); e.stopPropagation(); }}
            style={{ marginTop: 2, paddingTop: 6, borderTop: "1px solid var(--border)" }}
          >
            <input
              type="text"
              value={noteText}
              onChange={(e) => setNoteText(e.target.value)}
              onKeyDown={handleNoteKeyDown}
              onClick={(e) => e.stopPropagation()}
              onMouseDown={(e) => e.stopPropagation()}
              placeholder={`Add Note${lead.notes_count > 0 ? ` (${lead.notes_count})` : ""}…`}
              disabled={addNote.isPending}
              style={{
                width:        "100%",
                height:       32,
                padding:      "0 10px",
                fontSize:     11,
                border:       "1px solid var(--border)",
                borderRadius: 3,
                outline:      "none",
                fontFamily:   "inherit",
                boxSizing:    "border-box",
                background:   "var(--white)",
              }}
            />
          </div>
        </div>
      )}
    </div>
  );
}

function QuickBtn({ label, color, onClick, disabled = false, style, className }) {
  const [hov, setHov] = useState(false);
  const active = hov && !disabled;
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      onMouseEnter={() => setHov(true)}
      onMouseLeave={() => setHov(false)}
      className={className}
      style={{
        padding:      "3px 7px",
        borderRadius: 3,
        border:       `1px solid ${active ? color + "60" : "var(--border)"}`,
        background:   active ? color + "12" : "none",
        fontSize:     10,
        fontWeight:   600,
        color:        active ? color : "var(--text3)",
        cursor:       disabled ? "not-allowed" : "pointer",
        opacity:      disabled ? 0.55 : 1,
        transition:   "all 0.1s",
        whiteSpace:   "nowrap",
        ...style,
      }}
    >
      {label}
    </button>
  );
}