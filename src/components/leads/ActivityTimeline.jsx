/**
 * components/leads/ActivityTimeline.jsx
 *
 * Vertical timeline showing every event that happened to this lead,
 * oldest at the top (chronological order).
 * Each event type has its own icon color and shape.
 */
import Avatar     from "@/components/common/Avatar";
import Spinner    from "@/components/common/Spinner";
import EmptyState from "@/components/common/EmptyState";
import { useLeadActivity }                              from "@/hooks/useLeads";
import { ACTION_META, STAGE_META, timeAgo, formatDateTime } from "@/utils/formatters";

export default function ActivityTimeline({ leadId }) {
  const { data: entries = [], isLoading } = useLeadActivity(leadId);

  if (isLoading) return <Spinner center />;

  if (!entries.length) return (
    <EmptyState
      icon="◷"
      title="No activity yet"
      subtitle="Actions on this lead will appear here"
    />
  );

  return (
    <div style={{ position: "relative" }}>
      {/* Vertical line */}
      <div style={{
        position:   "absolute",
        left:       15,
        top:        8,
        bottom:     8,
        width:      2,
        background: "var(--border)",
        borderRadius: 2,
      }} />

      <div style={{ display: "flex", flexDirection: "column", gap: 0 }}>
        {entries.map((entry, idx) => (
          <TimelineEntry
            key={entry.id}
            entry={entry}
            isLast={idx === entries.length - 1}
          />
        ))}
      </div>
    </div>
  );
}

function buildDescription(entry) {
  if (entry.action === "stage_changed" && entry.meta) {
    const from = STAGE_META[entry.meta.from]?.label ?? (entry.meta.from?.replace(/_/g, " ") ?? "?");
    const to   = STAGE_META[entry.meta.to]?.label   ?? (entry.meta.to?.replace(/_/g, " ")   ?? "?");
    const name = entry.actor_name || "Someone";
    const lead = entry.lead_title ? `'${entry.lead_title}'` : "stage";
    return `${name} moved ${lead} from ${from} → ${to}`;
  }
  return entry.human_readable;
}

function TimelineEntry({ entry, isLast }) {
  const meta = ACTION_META[entry.action] ?? { icon: "•", color: "var(--text3)" };

  return (
    <div style={{
      display:       "flex",
      gap:           14,
      paddingBottom: isLast ? 0 : 16,
      position:      "relative",
    }}>
      {/* Icon bubble — sits on the vertical line */}
      <div style={{
        width:          32,
        height:         32,
        borderRadius:   "50%",
        background:     meta.color + "18",
        border:         `2px solid ${meta.color}30`,
        display:        "flex",
        alignItems:     "center",
        justifyContent: "center",
        fontSize:       14,
        flexShrink:     0,
        color:          meta.color,
        position:       "relative",
        zIndex:         1,
        backgroundColor: "var(--white)",
        boxShadow:      `0 0 0 3px var(--bg)`,
      }}>
        <span style={{ fontSize: 13 }}>{meta.icon}</span>
      </div>

      {/* Content */}
      <div style={{
        flex:          1,
        minWidth:      0,
        paddingTop:    4,
        paddingBottom: isLast ? 0 : 4,
      }}>
        {/* Main description */}
        <p style={{
          fontSize:   13,
          fontWeight: 500,
          color:      "var(--text)",
          lineHeight: 1.5,
          marginBottom: 6,
        }}>
          {buildDescription(entry)}
        </p>

        {/* Meta detail row */}
        <div style={{
          display:    "flex",
          alignItems: "center",
          gap:        8,
          flexWrap:   "wrap",
        }}>
          {/* Actor */}
          {entry.actor_name && (
            <div style={{ display: "flex", alignItems: "center", gap: 5 }}>
              <Avatar name={entry.actor_name} size={18} />
              <span style={{ fontSize: 11, color: "var(--text3)" }}>
                {entry.actor_name}
              </span>
            </div>
          )}

          <span style={{ fontSize: 10, color: "var(--border2)" }}>·</span>

          {/* Timestamp with tooltip */}
          <span
            title={formatDateTime(entry.created_at)}
            style={{ fontSize: 11, color: "var(--text3)", cursor: "help" }}
          >
            {timeAgo(entry.created_at)}
          </span>

          {/* Action label badge */}
          <span style={{
            fontSize:   10,
            fontWeight: 700,
            padding:    "1px 7px",
            borderRadius: 3,
            background: meta.color + "12",
            color:      meta.color,
          }}>
            {meta.label ?? entry.action}
          </span>
        </div>

        {/* Meta detail block — shows context from the action */}
        {entry.meta && Object.keys(entry.meta).length > 0 && (
          <MetaDetail action={entry.action} meta={entry.meta} />
        )}
      </div>
    </div>
  );
}

function MetaDetail({ action, meta }) {
  // Stage change: show old → new
  if (action === "stage_changed" && meta.from && meta.to) {
    return (
      <div style={{
        display:      "flex",
        alignItems:   "center",
        gap:          8,
        marginTop:    8,
        padding:      "6px 10px",
        background:   "var(--surface)",
        border:       "1px solid var(--border)",
        borderRadius: "var(--radius)",
        width:        "fit-content",
      }}>
        <StagePill stage={meta.from} />
        <span style={{ fontSize: 12, color: "var(--text3)" }}>→</span>
        <StagePill stage={meta.to} />
      </div>
    );
  }

  // Assignment: show who was assigned
  if ((action === "lead_assigned" || action === "lead_reassigned") && meta.assigned_to_name) {
    return (
      <div style={{
        display:      "flex",
        alignItems:   "center",
        gap:          6,
        marginTop:    8,
        padding:      "6px 10px",
        background:   "var(--surface)",
        border:       "1px solid var(--border)",
        borderRadius: "var(--radius)",
        width:        "fit-content",
        fontSize:     12,
        color:        "var(--text2)",
      }}>
        {meta.previous_assignee_name && (
          <>
            <span style={{ color: "var(--text3)" }}>{meta.previous_assignee_name}</span>
            <span style={{ color: "var(--text3)" }}>→</span>
          </>
        )}
        <Avatar name={meta.assigned_to_name} size={18} />
        <span style={{ fontWeight: 600 }}>{meta.assigned_to_name}</span>
        {meta.note && (
          <span style={{
            fontSize: 11, color: "var(--text3)",
            fontStyle: "italic", marginLeft: 4,
          }}>
            "{meta.note}"
          </span>
        )}
      </div>
    );
  }

  // Field update: show changed fields
  if (action === "lead_updated" && meta.changes) {
    const changes = Object.entries(meta.changes);
    if (!changes.length) return null;
    return (
      <div style={{
        marginTop:    8,
        padding:      "8px 10px",
        background:   "var(--surface)",
        border:       "1px solid var(--border)",
        borderRadius: "var(--radius)",
        display:      "flex",
        flexDirection: "column",
        gap:          4,
      }}>
        {changes.slice(0, 3).map(([field, change]) => (
          <div key={field} style={{
            display:  "flex",
            gap:      6,
            fontSize: 11,
            color:    "var(--text2)",
          }}>
            <span style={{
              fontWeight: 700,
              color:      "var(--text3)",
              minWidth:   80,
            }}>
              {field.replace(/_/g, " ")}
            </span>
            <span style={{ color: "var(--text3)" }}>{change.from || "—"}</span>
            <span style={{ color: "var(--text3)" }}>→</span>
            <span style={{ color: "var(--text)", fontWeight: 600 }}>
              {change.to || "—"}
            </span>
          </div>
        ))}
        {changes.length > 3 && (
          <span style={{ fontSize: 11, color: "var(--text3)" }}>
            +{changes.length - 3} more changes
          </span>
        )}
      </div>
    );
  }

  // Note preview
  if (action === "note_added" && meta.preview) {
    return (
      <div style={{
        marginTop:    8,
        padding:      "6px 10px",
        background:   "var(--surface)",
        border:       "1px solid var(--border)",
        borderLeft:   "3px solid var(--green)",
        borderRadius: "var(--radius)",
        fontSize:     12,
        color:        "var(--text2)",
        fontStyle:    "italic",
      }}>
        "{meta.preview}{meta.preview?.length >= 80 ? "…" : ""}"
      </div>
    );
  }

  return null;
}

function StagePill({ stage }) {
  const meta = STAGE_META[stage] ?? { label: stage, color: "var(--text3)", bg: "var(--bg)" };
  return (
    <span style={{
      fontSize:     11,
      fontWeight:   700,
      padding:      "2px 8px",
      borderRadius: 3,
      background:   meta.bg,
      color:        meta.color,
    }}>
      {meta.label}
    </span>
  );
}