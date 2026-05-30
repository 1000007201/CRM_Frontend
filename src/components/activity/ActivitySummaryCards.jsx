/**
 * components/activity/ActivitySummaryCards.jsx
 *
 * Top-of-page summary: total events, today, this week, most common action.
 */
import Spinner from "@/components/common/Spinner";
import { ACTION_META } from "@/utils/formatters";

export default function ActivitySummaryCards({ summary, loading }) {
  if (loading) return <Spinner center />;
  if (!summary) return null;

  const topAction = summary.by_action?.[0];
  const topUser   = summary.most_active_users?.[0];
  const topMeta   = topAction ? ACTION_META[topAction.action] : null;

  const cards = [
    {
      label: "Total Events",
      value: summary.total_events ?? 0,
      color: "#1A5A9A",
      icon:  "◷",
      sub:   "All time",
    },
    {
      label: "Today",
      value: summary.today ?? 0,
      color: "#E08818",
      icon:  "◈",
      sub:   "Events today",
    },
    {
      label: "This Week",
      value: summary.this_week ?? 0,
      color: "#C08010",
      icon:  "⚡",
      sub:   "Last 7 days",
    },
    {
      label: "Top Action",
      value: topMeta?.label ?? "—",
      color: topMeta?.color ?? "var(--text3)",
      icon:  topMeta?.icon  ?? "•",
      sub:   topAction ? `${topAction.count} times` : "No data",
    },
  ];

  return (
    <div className="stat-grid" style={{ marginBottom: 16 }}>
      {cards.map((c) => (
        <div key={c.label} className="card" style={{
          padding:    "14px 16px",
          borderLeft: `2px solid ${c.color}`,
        }}>
          <p style={{
            fontSize:      9,
            fontWeight:    600,
            color:         "var(--text3)",
            textTransform: "uppercase",
            letterSpacing: "0.1em",
            marginBottom:  8,
          }}>
            {c.label}
          </p>
          <p style={{
            fontSize:      typeof c.value === "string" ? 14 : 24,
            fontWeight:    700,
            color:         c.color,
            letterSpacing: "-0.02em",
            lineHeight:    1,
          }}>
            {c.icon} {c.value}
          </p>
          <p style={{ fontSize: 10, color: "var(--text3)", marginTop: 6 }}>
            {c.sub}
          </p>
        </div>
      ))}
    </div>
  );
}