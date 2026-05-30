/**
 * components/activity/ActivityTable.jsx
 *
 * Tabular view of activity log entries.
 * Clicking a row with a lead navigates to that lead's detail page.
 */
import { useNavigate } from "react-router-dom";
import Avatar          from "@/components/common/Avatar";
import Spinner         from "@/components/common/Spinner";
import EmptyState      from "@/components/common/EmptyState";
import { ACTION_META, STAGE_META, timeAgo, formatDateTime } from "@/utils/formatters";
import { useIsMobile } from "@/hooks/useIsMobile";

function stageLabel(k) {
  return STAGE_META[k]?.label ?? (k?.replace(/_/g, " ") ?? "?");
}

function formatDescription(entry) {
  if (entry.action === "stage_changed" && entry.meta) {
    return (
      <span>
        {entry.actor_name || "Someone"} moved &lsquo;{entry.lead_title || "lead"}&rsquo; from{" "}
        <strong>{stageLabel(entry.meta.from)}</strong>
        {" → "}
        <strong>{stageLabel(entry.meta.to)}</strong>
      </span>
    );
  }

  if (entry.action === "note_added") {
    const preview = entry.meta?.preview || entry.meta?.content || "";
    if (preview) {
      return (
        <span>
          {entry.human_readable}
          {": "}
          <span style={{ fontStyle: "italic", color: "var(--text2)" }}>
            &ldquo;{preview}&rdquo;
          </span>
        </span>
      );
    }
  }

  return entry.human_readable;
}

export default function ActivityTable({ entries = [], loading, emptyMessage }) {
  const navigate = useNavigate();
  const isMobile = useIsMobile();

  if (loading) return <Spinner center />;

  if (!entries.length) return (
    <EmptyState
      icon="◷"
      title="No activity found"
      subtitle={emptyMessage || "Try adjusting the filters above"}
    />
  );

  if (isMobile) {
    return (
      <div style={{ display: "flex", flexDirection: "column", gap: 10, padding: 12 }}>
        {entries.map((entry) => {
          const meta = ACTION_META[entry.action] ?? { icon: "•", color: "var(--text3)", label: entry.action };
          return (
            <div
              key={entry.id}
              onClick={() => entry.lead && navigate(`/leads/${entry.lead}`)}
              style={{
                padding: "12px 14px",
                background: "var(--white)",
                border: "1px solid var(--border)",
                borderRadius: 4,
                cursor: entry.lead ? "pointer" : "default",
                boxShadow: "0 1px 2px rgba(0,0,0,0.04)",
              }}
            >
              <div style={{ display: "flex", justifyContent: "space-between", gap: 8, marginBottom: 6, alignItems: "flex-start" }}>
                <span style={{
                  display: "inline-flex", alignItems: "center", gap: 5,
                  padding: "3px 9px", borderRadius: 3,
                  background: meta.color + "12", color: meta.color,
                  fontSize: 11, fontWeight: 700, whiteSpace: "nowrap", flexShrink: 0,
                }}>
                  <span>{meta.icon}</span>
                  {meta.label}
                </span>
                <span style={{ fontSize: 10, color: "var(--text3)", flexShrink: 0 }}
                  title={formatDateTime(entry.created_at)}>
                  {timeAgo(entry.created_at)}
                </span>
              </div>
              <div style={{ fontSize: 13, color: "var(--text)", marginBottom: 6, wordBreak: "break-word", lineHeight: 1.5 }}>
                {formatDescription(entry)}
              </div>
              <div style={{ fontSize: 11, color: "var(--text3)", display: "flex", gap: 10, flexWrap: "wrap", alignItems: "center" }}>
                {entry.lead_title && (
                  <span style={{ color: "var(--accent)", fontWeight: 600 }}>
                    {entry.lead_title}
                  </span>
                )}
                {entry.actor_name ? (
                  <span>👤 {entry.actor_name}</span>
                ) : (
                  <span>System</span>
                )}
              </div>
            </div>
          );
        })}
      </div>
    );
  }

  return (
    <div className="table-wrap">
      <table>
        <thead>
          <tr>
            <th>Action</th>
            <th>Description</th>
            <th>Lead</th>
            <th>Actor</th>
            <th>When</th>
          </tr>
        </thead>
        <tbody>
          {entries.map((entry) => {
            const meta = ACTION_META[entry.action] ?? { icon: "•", color: "var(--text3)", label: entry.action };
            return (
              <tr
                key={entry.id}
                style={{ cursor: entry.lead ? "pointer" : "default" }}
                onClick={() => entry.lead && navigate(`/leads/${entry.lead}`)}
              >
                {/* Action type badge */}
                <td style={{ verticalAlign: "top" }}>
                  <span style={{
                    display:      "inline-flex",
                    alignItems:   "center",
                    gap:          5,
                    padding:      "3px 9px",
                    borderRadius: 3,
                    background:   meta.color + "12",
                    color:        meta.color,
                    fontSize:     11,
                    fontWeight:   700,
                    whiteSpace:   "nowrap",
                  }}>
                    <span>{meta.icon}</span>
                    {meta.label}
                  </span>
                </td>

                {/* Human-readable description */}
                <td style={{
                  fontSize:      13,
                  color:         "var(--text)",
                  maxWidth:      400,
                  whiteSpace:    "normal",
                  wordBreak:     "break-word",
                  lineHeight:    1.5,
                  verticalAlign: "top",
                }}>
                  {formatDescription(entry)}
                </td>

                {/* Lead title */}
                <td style={{ verticalAlign: "top" }}>
                  {entry.lead_title ? (
                    <span style={{
                      fontSize: 12, color: "var(--accent)",
                      fontWeight: 600,
                      overflow: "hidden", textOverflow: "ellipsis",
                      whiteSpace: "nowrap",
                      display: "block", maxWidth: 160,
                    }}>
                      {entry.lead_title}
                    </span>
                  ) : (
                    <span style={{ fontSize: 12, color: "var(--text3)", fontStyle: "italic" }}>
                      (deleted)
                    </span>
                  )}
                </td>

                {/* Actor */}
                <td style={{ verticalAlign: "top" }}>
                  {entry.actor_name ? (
                    <div style={{ display: "flex", alignItems: "center", gap: 7 }}>
                      <Avatar name={entry.actor_name} size={24} />
                      <div>
                        <p style={{ fontSize: 12, fontWeight: 600 }}>{entry.actor_name}</p>
                        <p style={{ fontSize: 10, color: "var(--text3)" }}>
                          {entry.actor_role?.replace("_", " ")}
                        </p>
                      </div>
                    </div>
                  ) : (
                    <span style={{ fontSize: 12, color: "var(--text3)" }}>System</span>
                  )}
                </td>

                {/* Timestamp */}
                <td style={{ verticalAlign: "top" }}>
                  <span
                    title={formatDateTime(entry.created_at)}
                    style={{ fontSize: 12, color: "var(--text3)", cursor: "help" }}
                  >
                    {timeAgo(entry.created_at)}
                  </span>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}