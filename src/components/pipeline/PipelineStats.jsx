/**
 * components/pipeline/PipelineStats.jsx
 *
 * A summary bar above the Kanban board showing:
 *  - Total leads in view
 *  - Total pipeline value
 *  - Won count
 *  - Conversion rate (won / total)
 */


export default function PipelineStats({ pipeline }) {
  if (!pipeline) return null;

  const stages  = Object.values(pipeline);
  const total   = stages.reduce((s, c) => s + (c.count ?? 0), 0);
  const value   = stages.reduce((s, c) => s + (c.total_value ?? 0), 0);
  const won     = pipeline.won?.count    ?? 0;
  const lost    = pipeline.lost?.count   ?? 0;
  const active  = total - won - lost;
  const convRate = total > 0 ? Math.round((won / total) * 100) : 0;

  const stats = [
    { label: "Total Leads",    value: total,               color: "#1A5A9A" },
    { label: "Active",         value: active,              color: "#C08010" },
    { label: "Won",            value: won,                 color: "#18A858" },
    { label: "Conversion",     value: `${convRate}%`,      color: "#6030A0" },
  ];

  return (
    <div style={{
      display:  "flex",
      gap:      1,
      marginBottom: 16,
      background: "var(--white)",
      border:   "1px solid var(--border)",
      borderRadius: 4,
      overflow: "hidden",
      boxShadow: "var(--shadow-sm)",
    }}>
      {stats.map((s, i) => (
        <div key={s.label} style={{
          flex:     1,
          padding:  "14px 16px",
          borderRight: i < stats.length - 1
            ? "1px solid var(--border)" : "none",
          background: "var(--white)",
        }}>
          <p style={{
            fontSize:      10,
            fontWeight:    700,
            color:         "var(--text3)",
            textTransform: "uppercase",
            letterSpacing: "0.06em",
            marginBottom:  5,
          }}>
            {s.label}
          </p>
          <p style={{
            fontSize:      20,
            fontWeight:    700,
            color:         s.color,
            letterSpacing: "-0.02em",
            lineHeight:    1,
          }}>
            {s.value}
          </p>
        </div>
      ))}
    </div>
  );
}