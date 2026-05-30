/**
 * components/dashboard/ActivityFeed.jsx
 *
 * Shows the last N activity events with icon, description, and timestamp.
 * Auto-refreshes every 30 seconds via React Query.
 */
import { useNavigate } from "react-router-dom";
import { ACTION_META, timeAgo } from "@/utils/formatters";
import Avatar from "@/components/common/Avatar";
import Spinner from "@/components/common/Spinner";
import EmptyState from "@/components/common/EmptyState";

export default function ActivityFeed({ activities, loading, showViewAll = true }) {
  const navigate = useNavigate();

  return (
    <div className="card" style={{ height: "100%" }}>
      <div className="card-header">
        <h2 className="card-title">Activity Feed</h2>
        {showViewAll && (
          <button
            className="btn btn-secondary btn-sm"
            onClick={() => navigate("/activity")}
          >
            View All →
          </button>
        )}
      </div>

      {loading ? (
        <Spinner center />
      ) : !activities?.length ? (
        <EmptyState icon="◷" title="No activity yet" subtitle="Actions on leads will appear here" />
      ) : (
        <div style={{ padding: "4px 0" }}>
          {activities.map((entry, idx) => {
            const meta = ACTION_META[entry.action] ?? {
              icon: "•", color: "var(--text3)",
            };

            return (
              <div
                key={entry.id}
                style={{
                  display: "flex",
                  alignItems: "flex-start",
                  gap: 12,
                  padding: "10px 18px",
                  borderBottom: idx < activities.length - 1
                    ? "1px solid var(--border)"
                    : "none",
                  cursor: entry.lead ? "pointer" : "default",
                  transition: "background 0.1s",
                }}
                onMouseEnter={(e) => {
                  if (entry.lead) e.currentTarget.style.background = "var(--surface)";
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = "";
                }}
                onClick={() => {
                  if (entry.lead) navigate(`/leads/${entry.lead}`);
                }}
              >
                {/* Action icon bubble */}
                <div style={{
                  width: 32, height: 32, borderRadius: "50%",
                  background: meta.color + "15",
                  display: "flex", alignItems: "center", justifyContent: "center",
                  fontSize: 14, flexShrink: 0, marginTop: 1,
                  color: meta.color,
                }}>
                  {meta.icon}
                </div>

                {/* Content */}
                <div style={{ flex: 1, minWidth: 0 }}>
                  <p style={{
                    fontSize: 12, color: "var(--text)",
                    lineHeight: 1.5,
                    overflow: "hidden", textOverflow: "ellipsis",
                    display: "-webkit-box", WebkitLineClamp: 2,
                    WebkitBoxOrient: "vertical",
                  }}>
                    {entry.human_readable}
                  </p>

                  <div style={{
                    display: "flex", alignItems: "center",
                    gap: 6, marginTop: 4,
                  }}>
                    {entry.actor_name && (
                      <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
                        <Avatar name={entry.actor_name} size={16} />
                        <span style={{ fontSize: 10, color: "var(--text3)" }}>
                          {entry.actor_name}
                        </span>
                      </div>
                    )}
                    <span style={{ fontSize: 10, color: "var(--text3)" }}>·</span>
                    <span style={{ fontSize: 10, color: "var(--text3)" }}>
                      {timeAgo(entry.created_at)}
                    </span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}