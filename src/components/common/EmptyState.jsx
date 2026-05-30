/**
 * components/common/EmptyState.jsx
 *
 * Usage:
 *   <EmptyState
 *     icon="🔍"
 *     title="No leads found"
 *     subtitle="Try adjusting your filters"
 *     action={<button className="btn btn-primary btn-sm">Add Lead</button>}
 *   />
 */
export default function EmptyState({ icon = "◈", title, subtitle, action }) {
  return (
    <div className="empty-state">
      <div className="empty-state-icon">{icon}</div>
      {title    && <p style={{ fontWeight: 600, color: "var(--text2)", marginBottom: 4 }}>{title}</p>}
      {subtitle && <p>{subtitle}</p>}
      {action   && <div style={{ marginTop: 16 }}>{action}</div>}
    </div>
  );
}